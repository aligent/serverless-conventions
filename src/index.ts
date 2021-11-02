import Serverless = require("serverless");
import { Options } from "serverless";
import { Server } from "http";


class ServerlessConventions {
     serverless: Serverless;
     hooks: { [key: string]: Function }
     config: any

     constructor(serverless: Serverless, options: Options) {
          this.serverless = serverless;
          this.config = ''

          this.hooks = {
               'before:package:compileFunctions': this.initialize.bind(this)
          };
     }

     initialize() {
          this.serverless.cli.log('Starting function handler check');

          const functionNames = this.serverless.service.getAllFunctions();
          functionNames.forEach(fnName => {
               // Get handler name
               const fn = this.serverless.service.getFunction(fnName) as Serverless.FunctionDefinitionHandler;
               const handler = fn.handler.split('/').pop()?.slice(0, -8) as string;

               // Convert the function name and handler into values that can be compared (string[])
               // Convert from camel case to an array of strings
               const splitFn = fnName.split(/(?=[A-Z])/).map(s => s.toLowerCase());
               // Convert from - to an array of strings
               const splitHandler = handler.split('-');

               // Throw an error if the function does not match the handler name
               if (JSON.stringify(splitFn) != JSON.stringify(splitHandler)) {
                    // this.serverless.cli.log(`Warning: Function "${fnName}" does not match handler name "${handler}.handler"`);
                    throw new Error(`Warning: Function "${fnName}" does not match handler name "${handler}.handler"`);
               }
          });

          this.serverless.cli.log('Function check complete! No errors were found.');
     }
}

module.exports = ServerlessConventions;

// @aligent/serverless-conventions