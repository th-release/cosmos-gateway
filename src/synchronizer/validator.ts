import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { ValidatorEntity } from "src/entities/validator.entity";
import { databaseLoader } from "src/utils/db-loader";
import { Repository } from "typeorm";
import { uint8ArrayToHex } from "./utils";
import { config } from "../utils/config";
import { canonicalJsonStringify } from "../utils/json";

export class Validator {
    private client = Tendermint34Client.connect(config.rpcEndpoint);
    private repository: Repository<ValidatorEntity> = databaseLoader.getRepository(ValidatorEntity);
    private hasLoggedUpToDate = false;

    public async syncValidators(): Promise<void> {
        const validators = await (await this.client).validatorsAll().catch(() => undefined);
        if (!validators) {
            this.hasLoggedUpToDate = false;
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

                let dbPubkeyObject;
                try {
                    dbPubkeyObject = JSON.parse(dbValidator.pubkey);
                } catch (e) {
                    console.error("Error parsing dbValidator.pubkey:", e);
                    dbPubkeyObject = {};
                }

                const pubkeysAreEqual = canonicalJsonStringify(dbPubkeyObject) === canonicalJsonStringify(blockchainValidator.pubkey);

                if (dbValidator.votingPower != newVotingPower || 
                    dbValidator.proposerPriority != newProposerPriority ||
                    !pubkeysAreEqual) {
                    
                    dbValidator.votingPower = newVotingPower;
                    dbValidator.proposerPriority = newProposerPriority;
                    dbValidator.pubkey = JSON.stringify(blockchainValidator.pubkey);
                    
                    updatedValidators.push(dbValidator);
                }
            }
        });

        const hasChanges = addedValidators.length > 0 || removedValidators.length > 0 || updatedValidators.length > 0;

        try {
            if (hasChanges) {
                this.hasLoggedUpToDate = false;

                if (addedValidators.length > 0) {
                    await this.repository.save(addedValidators);
                    addedValidators.forEach(v => console.log(`Validator SYNC : Added ${v.address}`));
                }

                if (removedValidators.length > 0) {
                    await this.repository.remove(removedValidators);
                    removedValidators.forEach(v => console.log(`Validator SYNC : Removed ${v.address}`));
                }

                if (updatedValidators.length > 0) {
                    await this.repository.save(updatedValidators);
                    updatedValidators.forEach(v => console.log(`Validator SYNC : Updated ${v.address}`));
                }
            } else {
                if (!this.hasLoggedUpToDate) {
                    console.log("Validator data is already up-to-date. Skipping synchronization.");
                    this.hasLoggedUpToDate = true;
                }
            }
        } catch (error) {
            this.hasLoggedUpToDate = false;
            console.error('Error during validator sync:', error);
            throw error;
        }
    }


}