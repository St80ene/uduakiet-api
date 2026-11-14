import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestContext } from '../interfaces/request_context.interface';

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
