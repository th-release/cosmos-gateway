import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({name: "abci"})
export class AbciEntity {
    @PrimaryColumn({name: "data", nullable: false})
    data: string;

    @Column({name: "last_block_height", type: "bigint", nullable: true})
    last_block_height: number;

    @Column({name: "last_block_app_hash", type: "varchar", nullable: true})
    last_block_app_hash: string;

    @UpdateDateColumn({name: "last_update", nullable: false})
    lastUpdate: Date
}