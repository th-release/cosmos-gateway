import { BlockEntity } from "src/entities/block.entitiy";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { databaseLoader } from "src/utils/db-loader";
import { Repository } from "typeorm";
import { uint8ArrayToHex } from "./utils";
import { Transaction } from "./tx";
import { toHex } from "@cosmjs/encoding";
import { sha256 } from '@cosmjs/crypto';
import { TransactionEntity } from "src/entities/transaction.entity";

export class Block {
    private last: BlockEntity = undefined
    private client = Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    private repository: Repository<BlockEntity> = databaseLoader.getRepository(BlockEntity);
    private transaction: Transaction = new Transaction();

    private safeJSONStringify(obj: any): string {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        });
    }

    public async syncBlock(): Promise<void> {
        const search = await this.repository.find({
            order: {
                time: "DESC"
            }
        })

        if (search && search.length != 0) {
            const searchBlock = await (await this.client).block(+search[0].height).catch(() => undefined)

            if (!searchBlock || uint8ArrayToHex(searchBlock.blockId.hash) != search[0].blockIdHash) {
                const isDeleted = this.repository.deleteAll().catch(() => undefined);

                if (!isDeleted) {
                    return;
                }
            }
        }
        
        let block = await (await this.client).block(1).catch((err) => {return {success: false, message: err.message}}) as any
        if (!(block as {success: boolean, message: string}).success) {
            const match = (block as {success: boolean, message: string}).message.match(/lowest height is (\d+)/);
            if (match) {
                block = await (await this.client).block(Number(match[1]) ? Number(match[1]) : 1).catch(() => undefined)
            }
        }

        if (!this.last || this.last == undefined) {
            if (search && search.length != 0) {
                block = await (await this.client).block(+search[0].height).catch(() => undefined)
            }

            if (!block)
                return

            this.last = new BlockEntity()
            this.last.blockIdHash = uint8ArrayToHex(block.blockId.hash)
            this.last.chainId = block.block.header.chainId
            this.last.height = block.block.header.height
            this.last.round = block.block.lastCommit ? block.block.lastCommit.round : undefined
            this.last.lastCommitHash = uint8ArrayToHex(block.block.header.lastCommitHash)
            this.last.dataHash = uint8ArrayToHex(block.block.header.dataHash)
            this.last.validatorsHash = uint8ArrayToHex(block.block.header.validatorsHash)
            this.last.nextValidatorsHash = uint8ArrayToHex(block.block.header.nextValidatorsHash)
            this.last.consensusHash = uint8ArrayToHex(block.block.header.consensusHash)
            this.last.appHash = uint8ArrayToHex(block.block.header.appHash)
            this.last.lastResultsHash = uint8ArrayToHex(block.block.header.lastResultsHash)
            this.last.evidenceHash = uint8ArrayToHex(block.block.header.evidenceHash)
            this.last.proposerAddress = uint8ArrayToHex(block.block.header.proposerAddress)
            const signatures = block.block.lastCommit?.signatures || [] as any[]
            if (signatures.length != 0) {
                signatures.forEach((element) => {
                    element.validatorAddress = uint8ArrayToHex(element.validatorAddress)
                    element.signature = uint8ArrayToHex(element.signature)
                });
            }
            this.last.signatures = this.safeJSONStringify(signatures || []);
            this.last.time = new Date(block.block.header.time.toISOString())

            if (!search || search.length == 0) {
                const isBlocked = await this.repository.save(this.last).catch((err) => {console.error("BLCOK SYNC ERROR: " + err); return undefined})
                if (!isBlocked) {
                    return
                }

                console.log(`BLOCK SYNC : ${JSON.stringify(this.last)}`)
            }
        } else {
            block = await (await this.client).block(+this.last.height + 1).catch(() => undefined)
        }

        if (!block)
            return

        if (
            uint8ArrayToHex(block.blockId.hash) != this.last.blockIdHash
        ) {
            this.last.blockIdHash = uint8ArrayToHex(block.blockId.hash)
            this.last.chainId = block.block.header.chainId
            this.last.height = block.block.header.height
            this.last.round = block.block.lastCommit ? block.block.lastCommit.round : undefined
            this.last.lastCommitHash = uint8ArrayToHex(block.block.header.lastCommitHash)
            this.last.dataHash = uint8ArrayToHex(block.block.header.dataHash)
            this.last.validatorsHash = uint8ArrayToHex(block.block.header.validatorsHash)
            this.last.nextValidatorsHash = uint8ArrayToHex(block.block.header.nextValidatorsHash)
            this.last.consensusHash = uint8ArrayToHex(block.block.header.consensusHash)
            this.last.appHash = uint8ArrayToHex(block.block.header.appHash)
            this.last.lastResultsHash = uint8ArrayToHex(block.block.header.lastResultsHash)
            this.last.evidenceHash = uint8ArrayToHex(block.block.header.evidenceHash)
            this.last.proposerAddress = uint8ArrayToHex(block.block.header.proposerAddress)

            const signatures = block.block.lastCommit?.signatures || [] as {blockIdFlag: number, validatorAddress: string | any}[]
            if (signatures.length != 0) {
                signatures.forEach(element => {
                    element.validatorAddress = element.validatorAddress
                    element.signature = element.signature
                });
            }

            this.last.signatures = this.safeJSONStringify(signatures || []);
            this.last.time = new Date(block.block.header.time.toISOString())
            
            const isBlocked = await this.repository.save(this.last).catch((err) => {console.error("BLCOK SYNC ERROR: " + err); return undefined})
            if (!isBlocked) {
                return
            }

            console.log(`BLOCK SYNC : ${JSON.stringify(this.last)}`)

            block.block.txs.forEach(async (v) => {
                const tx = this.transaction.decodeCosmosTransaction(v)

                const transaction = new TransactionEntity();

                transaction.hash = toHex(sha256(v))
                transaction.block = this.last

                transaction.fee = this.safeJSONStringify(tx.authInfo?.fee || {});
                transaction.signerInfos = this.safeJSONStringify(tx.authInfo?.signerInfos || []);
                transaction.tip = this.safeJSONStringify(tx.authInfo?.tip || {});
                transaction.extensionOptions = this.safeJSONStringify(tx.body?.extensionOptions || []);
                transaction.memo = tx.body?.memo || '';
                transaction.messages = this.safeJSONStringify(tx.body?.messages || []);
                transaction.timeoutHeight = tx.body?.timeoutHeight ? Number(tx.body.timeoutHeight.toString()) : 0;
                transaction.nonCriticalExtensionOptions = this.safeJSONStringify(tx.body?.nonCriticalExtensionOptions || []);
                transaction.signatures = this.safeJSONStringify(tx.signatures || []);
                transaction.time = new Date(block.block.header.time.toISOString());

                const isTransactioned = await this.transaction.save(transaction).catch((err) => {console.error("TRANSACTION SYNC ERROR: " + err); return undefined})

                if (!isTransactioned) {
                    return;
                }

                console.log(`TRANSACTION SYNC : ${JSON.stringify(transaction)}`)
            })
        }
    }
}