import { Bip39, Random } from "@cosmjs/crypto";
import { Tendermint34Client, BlockResponse } from "@cosmjs/tendermint-rpc";

export interface BlockchainResponse {
    blocks: BlockResponse[];
}

import { config } from "../utils/config";

export class BlockchainService {
  private client = Tendermint34Client.connect(config.rpcEndpoint);

  public async blockchain(minHeight?: number, maxHeight?: number): Promise<BlockchainResponse> {
      const client = await this.client;
      if (!minHeight || !maxHeight) {
          const status = await client.status();
          const height = status.syncInfo.latestBlockHeight;
          const block = await client.block(height);
          return { blocks: [block] };
      }

      const blockPromises: Promise<BlockResponse>[] = [];
      for (let i = minHeight; i <= maxHeight; i++) {
          blockPromises.push(client.block(Math.floor(i)));
      }
      const blocks = await Promise.all(blockPromises);
      return { blocks };
  }

  public createPrivateKey() {
		const bytes = Random.getBytes(32);

		return {
			privateKeyBytes: bytes,
			privateKeyString: Buffer.from(bytes).toString('hex')
		}
	}

	public createMnemonic() {
		const bytes = Random.getBytes(32)

		const mnemonic = Bip39.encode(bytes).toString();

		return {
			mnemonicBytes: bytes,
			mnemonicString: mnemonic
		}
	}
}