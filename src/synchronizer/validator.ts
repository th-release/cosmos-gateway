import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { ValidatorEntity } from "src/entities/validator.entity";
import { databaseLoader } from "src/utils/db-loader";
import { Repository } from "typeorm";
import { uint8ArrayToHex } from "./utils";

export class Validator {
    private client = Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    private repository: Repository<ValidatorEntity> = databaseLoader.getRepository(ValidatorEntity);

    public async syncValidators(): Promise<void> {
        const validators = await (await this.client).validatorsAll().catch(() => undefined);
        if (!validators) {
            return;
        }

        const dbValidators = await this.repository.find({});
        const blockchainValidatorAddresses = new Set(
            validators.validators.map(v => uint8ArrayToHex(v.address))
        );
        
        const addedValidators: ValidatorEntity[] = [];
        validators.validators.forEach((blockchainValidator) => {
            const address = uint8ArrayToHex(blockchainValidator.address);
            const existsInDb = dbValidators.some(dbValidator => dbValidator.address === address);

            if (!existsInDb) {
                const entity = new ValidatorEntity();
                entity.address = address;
                entity.votingPower = Number(blockchainValidator.votingPower);
                entity.proposerPriority = blockchainValidator.proposerPriority || undefined;
                entity.pubkey = JSON.stringify(blockchainValidator.pubkey);
                
                addedValidators.push(entity);
            }
        });

        const removedValidators = dbValidators.filter(
            dbValidator => !blockchainValidatorAddresses.has(dbValidator.address)
        );

        const updatedValidators: ValidatorEntity[] = [];
        validators.validators.forEach((blockchainValidator) => {
            const address = uint8ArrayToHex(blockchainValidator.address);
            const dbValidator = dbValidators.find(v => v.address === address);

            if (dbValidator) {
                const newVotingPower = Number(blockchainValidator.votingPower);
                const newProposerPriority = blockchainValidator.proposerPriority || undefined;
                const newPubkey = JSON.stringify(blockchainValidator.pubkey);

                if (dbValidator.votingPower !== newVotingPower || 
                    dbValidator.proposerPriority !== newProposerPriority ||
                    dbValidator.pubkey !== newPubkey) {
                    
                    dbValidator.votingPower = newVotingPower;
                    dbValidator.proposerPriority = newProposerPriority;
                    dbValidator.pubkey = newPubkey;
                    
                    updatedValidators.push(dbValidator);
                }
            }
        });

        try {
            if (addedValidators.length > 0) {
                await this.repository.save(addedValidators);
                addedValidators.forEach(v => console.log(`Validator SYNC : ${v.address}`));
            }

            if (removedValidators.length > 0) {
                await this.repository.remove(removedValidators);
                removedValidators.forEach(v => console.log(`Validator SYNC : ${v.address}`));
            }

            if (updatedValidators.length > 0) {
                await this.repository.save(updatedValidators);
                updatedValidators.forEach(v => console.log(`Validator SYNC : ${v.address}`));
            }

        } catch (error) {
            console.error('Error during validator sync:', error);
            throw error;
        }
    }


}