import { Column, Entity, PrimaryColumn, OneToMany, Index } from "typeorm";

@Entity({name: "block"})
@Index("IDX_BLOCKS_HEIGHT", ["height"])
export class BlockEntity {
    @PrimaryColumn({ name: "block_id_hash", nullable: false })
    blockIdHash: string;

    @Column({ name: "chain_id", nullable: false })
    chainId: string

    @Column({ type: "bigint", name: "height", nullable: false, unique: true })
    height: number;

    @Column({ type: "bigint", name: "round", nullable: true })
    round: number | null;

    @Column({ name:"last_commit_hash", type: "varchar", nullable: true })
    lastCommitHash: string | null;

    @Column({ name:"data_hash", type: "varchar", nullable: false })
    dataHash: string;

    @Column({ name:"validator_hash", type: "varchar", nullable: false })
    validatorsHash: string;

    @Column({ name: "next_validators_hash", type: "varchar", nullable: false })
    nextValidatorsHash: string;

    @Column({ name: "consensus_hash", type: "varchar", nullable: false })
    consensusHash: string;

    @Column({ name: "app_hash", type: "varchar", nullable: false })
    appHash: string;

    @Column({ name: "last_result_hash", type: "varchar", nullable: false })
    lastResultsHash: string;

    @Column({ name:"evidence_hash", type: "varchar", nullable: false })
    evidenceHash: string;

    @Column({ name:"proposer_address", type: "varchar", nullable: false })
    proposerAddress: string;

    @Column({name: "signatures", type: "text", nullable: true })
    signatures: string | null;

    @Column({ name: "time", nullable: false })
    time: Date;
}