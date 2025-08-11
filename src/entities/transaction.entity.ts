import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { BlockEntity } from "./block.entitiy";

@Entity({name: "transaction"})
export class TransactionEntity{
    @PrimaryColumn({name: "hash", nullable: false})
    hash: string

    @ManyToOne(() => BlockEntity, (block) => block.blockIdHash, {nullable: false})
    @JoinColumn({ name: "block_id_hash", referencedColumnName: "blockIdHash" })
    block: BlockEntity

    @Column({ name: "fee", type: "text", nullable: false })
    fee: string

    @Column({ name: "signer_infos", type: "text", nullable: false })
    signerInfos: string

    @Column({ name: "tip", type:"text", nullable: false })
    tip: string
    
    @Column({ name: "extension_options", type:"text", nullable: false })
    extensionOptions: string

    @Column({ name: "memo", type:"text", nullable: true })
    memo: string

    @Column({ name: "messages", type:"text", nullable: true })
    messages: string
    
    @Column({ name: "timeout_height", type: "bigint", nullable: true })
    timeoutHeight: number;
    
    @Column({ name: "non_critical_extension_options", type:"text", nullable: true })
    nonCriticalExtensionOptions: string

    @Column({ name: "signatures", type: "text", nullable: false })
    signatures: string

    @Column({ name: "time", nullable: false })
    time: Date;
}