/// <reference types="vite/client" />
import type { Api, BarApi } from '../shared/types';

declare global {
  interface Window {
    api: Api;
    bar: BarApi;
  }
}
export {};
