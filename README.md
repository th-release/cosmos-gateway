# cosmos-gateway

# How to Start?

0. docker build
    * `docker build -t gateway:latest .`

1. docker start
    * `docker compose up -d`

# How to Use?

0. buf install --> https://buf.build/docs/cli/quickstart/ <--

1. buf generate

```sh
buf generate --template ${cosmos}/proto/buf.gen.ts.yaml --output ${cosmos_gateway}/src/proto
```

2. create service

```ts
export class ExampleService {}
```

3. Create Registry
```ts
import { Registry } from "@cosmjs/proto-signing";
import { createProtobufRpcClient, ProtobufRpcClient, QueryClient, StargateClient } from "@cosmjs/stargate";
export class ExampleService {
    private reigstry: Registry = createBufRegistry(
        [
            // Tx messages
            ['/example.currency.v1.MsgCreateToken', MsgCreateToken],
            ['/example.currency.v1.MsgUpdateToken', MsgUpdateToken],
            ['/example.currency.v1.MsgMintToken', MsgMintToken],
            ['/example.currency.v1.MsgBurnToken', MsgBurnToken],
            ['/example.currency.v1.MsgTransferToken', MsgTransferToken],
            // Types
            ['/example.currency.v1.Token', Token],
        ]
    )

    private async getQueryclient(): Promise<QueryClient> {
        const tmClient = await Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
        return new QueryClient(tmClient);
    }

    private async getProtobufRpcClient(): Promise<ProtobufRpcClient> {
        return createProtobufRpcClient(await this.getQueryclient());
    }

    private async getStargateClient(): Promise<StargateClient> {
        return await StargateClient.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    }
}
```

4. Create Query & Message

```ts
import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet, Registry } from "@cosmjs/proto-signing";
import { createProtobufRpcClient, GasPrice, ProtobufRpcClient, QueryClient, SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { Token } from "src/proto/example/currency/v1/token";
import { MsgCreateToken, MsgMintToken, MsgTransferToken, MsgUpdateToken, MsgBurnToken } from "src/proto/example/currency/v1/tx";
import * as currency from "src/proto/example/currency/v1/query";
import { createBufRegistry } from "src/utils/message";

export class ExampleService {
    private reigstry: Registry = createBufRegistry(
        [
            // Tx messages
            ['/example.currency.v1.MsgCreateToken', MsgCreateToken],
            ['/example.currency.v1.MsgUpdateToken', MsgUpdateToken],
            ['/example.currency.v1.MsgMintToken', MsgMintToken],
            ['/example.currency.v1.MsgBurnToken', MsgBurnToken],
            ['/example.currency.v1.MsgTransferToken', MsgTransferToken],
            // Types
            ['/example.currency.v1.Token', Token],
        ]
    )

    private async getQueryclient(): Promise<QueryClient> {
        const tmClient = await Tendermint34Client.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
        return new QueryClient(tmClient);
    }

    private async getProtobufRpcClient(): Promise<ProtobufRpcClient> {
        return createProtobufRpcClient(await this.getQueryclient());
    }

    private async getStargateClient(): Promise<StargateClient> {
        return await StargateClient.connect(process.env.RPC_ENDPOINT || "http://localhost:26657");
    }

    public async listToken(req: currency.QueryAllTokenRequest) {
        try {
            const client = await this.getProtobufRpcClient();

            const queryCurrency = new currency.QueryClientImpl(client)

            return {
                success: true,
                data: {
                storage: await queryCurrency.ListToken(req)
                }
            };
        } catch (e) {
            return {
                success: false,
                error: e
            };
        }
    }

    public async mintToken(wallet: DirectSecp256k1HdWallet | DirectSecp256k1Wallet, denom: string, amount: number, to: string) {
        if (!wallet || (!denom || denom.length == 0) || (!to || to.length == 0) || amount < 1) {
            return {
                success: false,
                error: "wallet, denom, amount, to is required"
            }
        }
        
        try {
            const [w] = await wallet.getAccounts()

            const client = await SigningStargateClient.connectWithSigner(
                process.env.RPC_ENDPOINT,
                wallet,
                { gasPrice: GasPrice.fromString(process.env.GAS_FEE), registry: this.reigstry }
            );

            const mintMsg = {
                typeUrl: '/example.currency.v1.MsgMintToken',
                value: {
                owner: w.address,
                denom: denom,
                to,
                amount
                }
            };
            
            const result = await client.signAndBroadcast(
                w.address,
                [mintMsg],
                'auto',
                'Mint Token'
            );

            client.disconnect();
            return {success: true, result};
        } catch (e) {
            return {
                success: false,
                error: e
            }
        }
    }
}
```

# Donate
### USDT(TRON)
> TQtsMhMAVL32MEm7eKDF2r4AvfuQQwwUih
