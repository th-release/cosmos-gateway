import { BlockEntity } from "src/entities/block.entitiy";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { databaseLoader } from "src/utils/db-loader";
import { Repository, MoreThan, In } from "typeorm";
import { uint8ArrayToHex } from "./utils";
import { Transaction } from "./tx";
import { toHex } from "@cosmjs/encoding";
import { sha256 } from '@cosmjs/crypto';
import { TransactionEntity } from "src/entities/transaction.entity";
import { BlockchainService } from "src/blockchain/blockchain.service";
import { safeJSONStringify } from "../utils/json";

import { config } from "../utils/config";

export class Block {
    private client = Tendermint34Client.connect(config.rpcEndpoint);
    private repository: Repository<BlockEntity> = databaseLoader.getRepository(BlockEntity);
    private transaction: Transaction = new Transaction();
    private blockchainService: BlockchainService = new BlockchainService();
    private isSyncing = false
    private hasLoggedUpToDate = false

    private async handleChainIdMismatch(client: Tendermint34Client, latestHeight: number): Promise<void> {
        const incomingChainId = (await client.block(latestHeight)).block.header.chainId;

        const existingChainIds = await this.repository
            .createQueryBuilder("block")
            .select("DISTINCT block.chainId", "chainId")
            .getRawMany();

        const dbChainIds = existingChainIds.map((row: any) => row.chainId);

        if (dbChainIds.length > 1 || (dbChainIds.length === 1 && dbChainIds[0] !== incomingChainId)) {
            console.log(`Chain ID mismatch or multiple chain IDs detected. Clearing database.`);
            await this.repository.query("TRUNCATE TABLE \"block\" CASCADE");
        }
    }

    private async handleReorganization(client: Tendermint34Client, lastDbBlock: BlockEntity, latestHeight: number): Promise<number> {
        const lastBlockOnChain = await client.block(lastDbBlock.height).catch(() => undefined);
        if (!lastBlockOnChain || uint8ArrayToHex(lastBlockOnChain.blockId.hash) !== lastDbBlock.blockIdHash) {
            console.warn(`Hash mismatch detected at height ${lastDbBlock.height}.`);
            console.warn(`DB Hash: ${lastDbBlock.blockIdHash}`);
            console.warn(`Chain Hash: ${lastBlockOnChain ? uint8ArrayToHex(lastBlockOnChain.blockId.hash) : 'N/A'}`);

            if (lastDbBlock.height === latestHeight) {
                console.log(`Re-syncing latest block ${lastDbBlock.height} due to hash mismatch.`);
                await this.transaction.repository.delete({ block: { blockIdHash: lastDbBlock.blockIdHash } });
                await this.repository.delete({ blockIdHash: lastDbBlock.blockIdHash });
                return lastDbBlock.height;
            } else {
                console.log(`Deeper chain reorganization detected. Finding common ancestor.`);
                let commonAncestorHeight = 0;
                let currentHeight = lastDbBlock.height;

                while (currentHeight >= 0) {
                    const blockOnChain = await client.block(currentHeight).catch(() => undefined);
                    const blockInDb = await this.repository.findOne({ where: { height: currentHeight } });

                    if (blockOnChain && blockInDb && uint8ArrayToHex(blockOnChain.blockId.hash) === blockInDb.blockIdHash) {
                        commonAncestorHeight = currentHeight;
                        break;
                    }
                    currentHeight--;
                }

                if (commonAncestorHeight > 0) {
                    const blocksToDelete = await this.repository.find({
                        select: ["blockIdHash"],
                        where: { height: MoreThan(commonAncestorHeight) }
                    });

                    const blockIdsToDelete = blocksToDelete.map(block => block.blockIdHash);

                    if (blockIdsToDelete.length > 0) {
                        await this.transaction.repository.delete({ block: In(blockIdsToDelete) });
                    }
                    await this.repository.delete({ height: MoreThan(commonAncestorHeight) });
                    return commonAncestorHeight + 1;
                } else {
                    await this.repository.query("TRUNCATE TABLE \"block\" CASCADE");
                    return 1;
                }
            }
        } else {
            return lastDbBlock.height + 1;
        }
    }

    

    public async syncBlock(): Promise<void> {
        if (this.isSyncing) {
            return;
        }

        this.isSyncing = true;
        try {
            const client = await this.client;
            const status = await client.status();
            const latestHeight = status.syncInfo.latestBlockHeight;

            await this.handleChainIdMismatch(client, latestHeight);

            const lastDbBlocks = await this.repository.find({ order: { height: 'DESC' }, take: 1 });
            let lastDbBlock = lastDbBlocks.length > 0 ? lastDbBlocks[0] : null;

            if (lastDbBlock && lastDbBlock.height == latestHeight) {
                if (!this.hasLoggedUpToDate) {
                    console.log("Database is already up-to-date. Skipping synchronization.");
                    this.hasLoggedUpToDate = true;
                }
                return;
            }

            let startHeight = 1;

            if (lastDbBlock) {
                startHeight = await this.handleReorganization(client, lastDbBlock, latestHeight);
            }

            if (!lastDbBlock) {
                try {
                    await client.block(1);
                } catch (err) {
                    const message = (err as any).message || '';
                    const match = message.match(/lowest height is (\d+)/);
                    if (match) {
                        startHeight = Number(match[1]);
                    }
                }
            }
            this.hasLoggedUpToDate = false;
            const batchSize = config.batchSize;
            for (let height = startHeight; height <= latestHeight; height += batchSize) {
                const maxHeight = Math.min(height + batchSize - 1, latestHeight);
                const { blocks } = await this.blockchainService.blockchain(height, maxHeight);

                const blockEntities: BlockEntity[] = [];
                let transactionEntities: TransactionEntity[] = [];

                for (const block of blocks) {
                    if (!block) continue;

                    const blockEntity = new BlockEntity();
                    blockEntity.blockIdHash = uint8ArrayToHex(block.blockId.hash);
                    blockEntity.chainId = block.block.header.chainId;
                    blockEntity.height = block.block.header.height;
                    blockEntity.round = block.block.lastCommit ? block.block.lastCommit.round : undefined;
                    blockEntity.lastCommitHash = uint8ArrayToHex(block.block.header.lastCommitHash);
                    blockEntity.dataHash = uint8ArrayToHex(block.block.header.dataHash);
                    blockEntity.validatorsHash = uint8ArrayToHex(block.block.header.validatorsHash);
                    blockEntity.nextValidatorsHash = uint8ArrayToHex(block.block.header.nextValidatorsHash);
                    blockEntity.consensusHash = uint8ArrayToHex(block.block.header.consensusHash);
                    blockEntity.appHash = uint8ArrayToHex(block.block.header.appHash);
                    blockEntity.lastResultsHash = uint8ArrayToHex(block.block.header.lastResultsHash);
                    blockEntity.evidenceHash = uint8ArrayToHex(block.block.header.evidenceHash);
                    blockEntity.proposerAddress = uint8ArrayToHex(block.block.header.proposerAddress);
                    const signatures = block.block.lastCommit?.signatures || [] as any[];
                    if (signatures.length != 0) {
                        signatures.forEach((element) => {
                            element.validatorAddress = element.validatorAddress;
                            element.signature = element.signature;
                        });
                    }
                    blockEntity.signatures = safeJSONStringify(signatures || []);
                    blockEntity.time = new Date(block.block.header.time.toISOString());
                    blockEntities.push(blockEntity);

                    console.log(`BLOCK SYNC : ${JSON.stringify(blockEntity)}`);

                    const blockTransactions = block.block.txs.map(v => {
                        const tx = this.transaction.decodeCosmosTransaction(v);
                        const transaction = new TransactionEntity();
                        transaction.hash = toHex(sha256(v));
                        transaction.block = blockEntity;
                        transaction.fee = safeJSONStringify(tx.authInfo?.fee || {});
                        transaction.signerInfos = safeJSONStringify(tx.authInfo?.signerInfos || []);
                        transaction.tip = safeJSONStringify(tx.authInfo?.tip || {});
                        transaction.extensionOptions = safeJSONStringify(tx.body?.extensionOptions || {});
                        transaction.memo = tx.body?.memo || '';
                        transaction.messages = safeJSONStringify(tx.body?.messages || []);
                        transaction.timeoutHeight = tx.body?.timeoutHeight ? Number(tx.body.timeoutHeight.toString()) : 0;
                        transaction.nonCriticalExtensionOptions = safeJSONStringify(tx.body?.nonCriticalExtensionOptions || {});
                        transaction.signatures = safeJSONStringify(tx.signatures || []);
                        transaction.time = new Date(block.block.header.time.toISOString());
                        console.log(`TRANSACTION SYNC : ${JSON.stringify(transaction)}`);
                        return transaction;
                    });
                    transactionEntities = transactionEntities.concat(blockTransactions);
                }

                if (blockEntities.length > 0) {
                    await this.repository.save(blockEntities).catch((err) => { console.error("BLOCKS SYNC ERROR: " + err); });
                }
                if (transactionEntities.length > 0) {
                    await this.transaction.save(transactionEntities).catch((err) => { console.error("TRANSACTIONS SYNC ERROR: " + err); });
                }
            }
        } catch (error) {
            console.error("Error during block synchronization:", error);
        } finally {
            this.isSyncing = false;
        }
    }
}