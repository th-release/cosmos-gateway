import { AbciEntity } from "src/entities/abci.entity";
import { databaseLoader } from "src/utils/db-loader";
import { Repository } from "typeorm";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { uint8ArrayToHex } from "./utils";

export class Abci {
    private last: AbciEntity = undefined;
    private client = Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    private repository: Repository<AbciEntity> = databaseLoader.getRepository(AbciEntity);

    public async syncAbci(): Promise<void> {
        const abci = await (await this.client).abciInfo().catch(() => undefined)
        if (!abci) {
            return;
        }

        if (!this.last) {
            const search = await this.repository.find({
                where: {
                    data: abci.data
                },
                order: {
                    lastUpdate: "DESC"
                }
            })

            if (!search || search.length == 0) {
                const entity = new AbciEntity()
    
                entity.data = abci.data
                entity.last_block_app_hash = uint8ArrayToHex(abci.lastBlockAppHash)
                entity.last_block_height = abci.lastBlockHeight
    
                const abcied = await this.repository.save(entity).catch((err) => {console.log("ABCI ERROR: " + err); return undefined})
                if (!abcied) {
                    return;
                }

                this.last = entity
                console.log(`ABCI SYNC : ${JSON.stringify(this.last)}`)
                return
            } else {
                if (
                    uint8ArrayToHex(abci.lastBlockAppHash) != search[0].last_block_app_hash || abci.lastBlockHeight != search[0].last_block_height
                ) {
                    this.last = new AbciEntity();
                    this.last.data = abci.data
                    this.last.last_block_app_hash = uint8ArrayToHex(abci.lastBlockAppHash)
                    this.last.last_block_height = abci.lastBlockHeight
                    
                    const abcied = await this.repository.save(this.last).catch((err) => {console.log("ABCI ERROR: " + err); return undefined})
                    if (!abcied) {
                        return;
                    }

                    console.log(`ABCI SYNC : ${JSON.stringify(this.last)}`)
                }
                
                return
            }
        }

        if (
            uint8ArrayToHex(abci.lastBlockAppHash) != this.last.last_block_app_hash || abci.lastBlockHeight != this.last.last_block_height
        ) {
            this.last.data = abci.data
            this.last.last_block_app_hash = uint8ArrayToHex(abci.lastBlockAppHash)
            this.last.last_block_height = abci.lastBlockHeight
            
            const abcied = await this.repository.save(this.last).catch((err) => {console.log("ABCI ERROR: " + err); return undefined})
            if (!abcied) {
                return;
            }

            console.log(`ABCI SYNC : ${JSON.stringify(this.last)}`)
        }
    }
}