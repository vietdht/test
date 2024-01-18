import 'dotenv/config';
import {
  CasperClient,
  CLValueBuilder,
  Contracts,
  DeployUtil, Keys,
  RuntimeArgs
} from "casper-js-sdk";
import axios from "axios";
import {getDeploy} from "./utils";

const MOTE_RATE = 1_000_000_000;

const USER_KEYS = Keys.Ed25519.loadKeyPairFromPrivateFile(
  `./accounts/account-1/secret_key.pem`
);

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

(async () => {
  const casperClient = new CasperClient(process.env.NODE_URL!)
  const contractClient = new Contracts.Contract(casperClient);

  const balanceBefore = await casperClient.balanceOfByPublicKey(USER_KEYS.publicKey);
  contractClient.setContractHash(`hash-${process.env.SAMPLE_CONTRACT_HASH}`);
  const setMessageDeploy = contractClient.callEntrypoint("set_message", RuntimeArgs.fromMap({
    "message": CLValueBuilder.string("Hello from API"),
  }), USER_KEYS.publicKey, process.env.CHAIN_NAME!, String(3 * MOTE_RATE), [USER_KEYS]);

  const response = await axios.post(`/deploy`, {deploy: DeployUtil.deployToJson(setMessageDeploy)}, {baseURL: process.env.API_BASE_URL!});
  const {deployHash} = response.data;

  await sleep(1000);
  await getDeploy(process.env.NODE_URL!, deployHash)

  const message = await contractClient.queryContractData(["message"]);
  const caller = await contractClient.queryContractData(["caller"]);
  console.log("Message on recipient contract: ", message);
  console.log("Caller: ", USER_KEYS.publicKey.toAccountRawHashStr())
  console.log("Caller on recipient contract: ", caller);

  const balanceAfter = await casperClient.balanceOfByPublicKey(USER_KEYS.publicKey);
  console.log(`Balance before: ${balanceBefore.div(MOTE_RATE).toString()}
         after: ${balanceAfter.div(MOTE_RATE).toString()}`);
})();