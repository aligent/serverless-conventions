import Serverless = require("serverless");
import { Options } from "serverless";
import { Server } from "http";
import { camelCase, paramCase as kebabCase } from "change-case";


class ServerlessConventions {
     serverless: Serverless;
     hooks: { [key: string]: Function }
     config: any
     errors: Array<string>

     constructor(serverless: Serverless, options: Options) {
          this.serverless = serverless;
          this.config = '';
          this.errors = [];

          this.hooks = {
               'before:package:compileFunctions': this.initialize.bind(this)
          };
     }

     initialize() {
          // Check that all the conventions are followed and build a list of errors
          this.checkHandlerName();
          this.checkFunctionName();
          this.checkHandlerNameMatchesFunction();

          // If there were errors detected throw them all
          if (this.errors.length !== 0) {
               throw Error(this.errors.join('\r\n'));
          }
          
          this.serverless.cli.log('Function check complete! No errors were found.');
     }

     // Handler name conventions
     // Must be kebab-case (dash delimited)
     // Must end in .handler
     checkHandlerName() {
          this.serverless.cli.log('Checking handler names');

          const functionNames = this.serverless.service.getAllFunctions();
          functionNames.forEach(fnName => {
               const fn = this.serverless.service.getFunction(fnName) as Serverless.FunctionDefinitionHandler;
               // Get the full handler name (including path)
               const handlerFullPath = fn.handler as string;
               // Get the handler name with file extension but no path
               const handlerName = handlerFullPath.split('/').pop() as string;
               // Get the handler name with no path and no file extension
               const handlerNameNoExtension = handlerName.replace('.handler', '') as string;

               // Check that the handler name is in kebab case
               if (handlerNameNoExtension !== kebabCase(handlerNameNoExtension)) {
                    this.errors.push(`Warning: Handler "${handlerName}" is not kebab case (dash delimited)`);
               }

               // Check that the handler ends in .handler
               if (handlerNameNoExtension === handlerName) {
                    this.errors.push(`Warning: Handler "${handlerName}" does not end in ".handler"`);
               }
          });
     }

     // Function name conventions
     // Must be camelCase
     checkFunctionName() {
          this.serverless.cli.log('Checking function names');

          const functionNames = this.serverless.service.getAllFunctions();
          functionNames.forEach(fnName => {
               // Check that the function name is in camel case
               if (fnName !== camelCase(fnName)) {
                    this.errors.push(`Warning: Function "${fnName}" is not camel case`);
               }
          });
     }

     // Function / handler name conventions
     // Handler names must have the same name as the function
     checkHandlerNameMatchesFunction() {
          this.serverless.cli.log('Checking function names match handler names');

          const functionNames = this.serverless.service.getAllFunctions();
          functionNames.forEach(fnName => {
               const fn = this.serverless.service.getFunction(fnName) as Serverless.FunctionDefinitionHandler;
               // Get handler name removing any path and the .handler extension
               const handler = fn.handler.split('/').pop()?.replace('.handler', '') as string;

               // Throw an error if the function does not match the handler name
               if (camelCase(fnName) !== camelCase(handler) && kebabCase(fnName) !== kebabCase(handler)) {
                    this.errors.push(`Warning: Function "${fnName}" does not match handler name "${handler}.handler"`);
               }
          });
     }
}

module.exports = ServerlessConventions;
