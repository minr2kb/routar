import { createAxiosExecutor } from '@routar/axios';
import { createFetchExecutor } from '@routar/fetch';
import axios from 'axios';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

const clientInstance = axios.create({ baseURL: BASE_URL });

export const clientExecutor = createAxiosExecutor(() => clientInstance);

export const serverExecutor = createFetchExecutor(BASE_URL);
