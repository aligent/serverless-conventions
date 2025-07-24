import Serverless from 'serverless';
import ServerlessError from 'serverless/classes/ServerlessError';

export type ServerlessClasses = Serverless & {
  classes?: { Error: typeof ServerlessError };
}

export type ConventionsConfig = {
  ignore: {
    serviceName?: boolean;
    stageName?: boolean;
    handlerName?: boolean;
    functionName?: boolean;
    handlerNameMatchesFunction?: boolean;
    dynamoDBTableName?: boolean;
  };
};
