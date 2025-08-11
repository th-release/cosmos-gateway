import * as express from 'express';
import { AppController } from './app/app.controller';
import { WalletController } from './wallet/wallet.controller';
import { Interval } from './utils/interval'
import { env } from 'process';
import { Abci } from './synchronizer/abci';
import { Block } from './synchronizer/block';
import { Validator } from './synchronizer/validator';

const controllers = [new AppController('/'), new WalletController('/wallet')]

export default class App {
  public router: express.Application;
  private abci: Abci = new Abci()
  private block: Block = new Block()
  private validator: Validator = new Validator()
  
  constructor(app: express.Application) {
    this.router = app;
    this.controllerInit();
    this.synchronizerInit();
    this.start();
  }

  private controllerInit(): void {
    try {
      controllers.forEach((controller) => {
        const controllerRouter: express.Router = controller.getRouter();
        this.router.use('/api', controllerRouter);
      })
    } catch (err) {
      console.error('controller Init Error:' + err)
      return process.exit(1);
    }

    console.log("controller Init Success");
  }

  private async synchronizerInit(): Promise<void> {
    if (env.USED_SYNCHRONIZER.toLowerCase() == "true") {
      try {
        const sync = Interval(async () => {
          await this.abci.syncAbci()
          await this.block.syncBlock()
          await this.validator.syncValidators()
        }, +env.SYNC_MS)
      } catch (err) {
        console.error('synchronizer Init Error:' + err)
      }
  
      console.log("synchronizer Init Success");
    }
  }

  private start(): void {
    this.router.listen(process.env.PORT ?? 3000, () => {
      console.log(`Server is running on port: ${process.env.PORT ?? 3000}`)
    });
  }
}
