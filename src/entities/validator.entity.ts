import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({name: "validator"})
export class ValidatorEntity {
    @PrimaryColumn({ name: "address", nullable: false })
    address: string;

    @Column({ name: "voting_power", type: "bigint", nullable: false })
    votingPower: number

    @Column({ name: "proposer_priority", nullable: true })
    proposerPriority: number

    @Column({ name: "pubkey", nullable: true })
    pubkey: string
}