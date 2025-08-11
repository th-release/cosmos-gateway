import { Column, Entity, PrimaryColumn, OneToMany, Index } from "typeorm";

@Entity({name: "block"})
@Index("IDX_BLOCKS_HEIGHT", ["height"]) // 높이로 빠른 검색을 위한 인덱스
export class BlockEntity {
    @PrimaryColumn({ name: "block_id_hash", nullable: false })
    blockIdHash: string;

    @Column({ name: "chain_id", nullable: false }) // "chain-id" 대신 "chain_id" 사용 (하이픈 문제 방지)
    chainId: string

    @Column({ type: "bigint", name: "height", nullable: false, unique: true }) // 높이도 유니크해야 함
    height: number;

    @Column({ type: "bigint", name: "round", nullable: true })
    round: number | null; // nullable이므로 null 타입 명시

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