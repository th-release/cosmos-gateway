import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { ValidatorEntity } from "src/entities/validator.entity";
import { databaseLoader } from "src/utils/db-loader";
import { Repository } from "typeorm";
import { uint8ArrayToHex } from "./utils";

export class Validator {
    private client = Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    private repository: Repository<ValidatorEntity> = databaseLoader.getRepository(ValidatorEntity);

    public async syncValidators(): Promise<void> {
        const validators = await (await this.client).validatorsAll().catch(() => undefined)
        if (!validators) {
            return;
        }

        const all = await this.repository.find({})

        validators.validators.forEach((d) => {
            let find = false
            all.forEach((v) => {
                if (uint8ArrayToHex(d.address) == v.address) {
                    find = true 
                }
            })

            if (find == false) {
                const entity = new ValidatorEntity()

                entity.address = uint8ArrayToHex(d.address)
                entity.votingPower = Number(d.votingPower)
                entity.proposerPriority = d.proposerPriority ? d.proposerPriority : undefined
                entity.pubkey = JSON.stringify(d.pubkey)
                this.repository.save(entity)

                console.log(`Validator SYNC : ${JSON.stringify(entity)}`)
            }
        })
    }
}