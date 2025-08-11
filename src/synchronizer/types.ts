import { Fee, ModeInfo, Tip } from "cosmjs-types/cosmos/tx/v1beta1/tx";

export interface JsonRpcResponse<T = any> {
    jsonrpc: string;
    id: number;
    result: T;
}

export interface AbciInfoResponse {
    response: AbciInfo
}

export interface AbciInfo {
    data: string
    last_block_height: string
    last_block_app_hash: string
}

interface Version {
    block: string;
}
   
interface Parts {
    total: number;
    hash: string;
}
   
interface BlockId {
    hash: string;
    parts: Parts;
}
   
interface Header {
    version: Version;
    chain_id: string;
    height: string;
    time: string;
    last_block_id: BlockId;
    last_commit_hash: string;
    data_hash: string;
    validators_hash: string;
    next_validators_hash: string;
    consensus_hash: string;
    app_hash: string;
    last_results_hash: string;
    evidence_hash: string;
    proposer_address: string;
}
   
interface Data {
    txs: string[]; // 트랜잭션 배열 (빈 배열이지만 일반적으로 문자열 배열)
}
   
interface Evidence {
    evidence: any[]; // Evidence 구조체의 구체적 타입이 필요하면 정의 가능
}
   
   interface Signature {
    block_id_flag?: number;
    validator_address?: string;
    timestamp?: string;
    signature?: string;
   }
   
interface LastCommit {
    height: string;
    round: number;
    block_id: BlockId;
    signatures: Signature[];
}
   
interface Block {
    header: Header;
    data: Data;
    evidence: Evidence;
    last_commit: LastCommit;
}

export interface BlockResult {
    block_id: BlockId;
    block: Block;
}

export interface CosmosTransaction {
    hash: string;
    authInfo: {
        signerInfos: {
            publicKey?: any;
            modeInfo?: ModeInfo;
            sequence: number;
        }[]
        fee?: Fee;
        tip?: Tip;
    }
    body: {
        messages: {
            typeUrl: string;
            value: any[];
        }[]
        memo: string;
        timeoutHeight: bigint;
        extensionOptions: any[];
        nonCriticalExtensionOptions: any[];
    }
    signatures: string[];
}