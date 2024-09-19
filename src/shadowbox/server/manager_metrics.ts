// Copyright 2018 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {PrometheusClient} from '../infrastructure/prometheus_scraper';
import {DataUsageByUser, DataUsageTimeframe} from '../model/metrics';

export type TunnelTimeDimension = 'access_key' | 'country' | 'asn';

interface TunnelTimeRequest {
  time_window: {
    seconds: number;
  };
}

interface TunnelTimeResponse {
  location?: string;
  asn?: number;
  as_org?: string;
  tunnel_time: {
    seconds: number;
  };
}

export interface ManagerMetrics {
  getOutboundByteTransfer(timeframe: DataUsageTimeframe): Promise<DataUsageByUser>;
  getTunnelTimeByLocation(request: TunnelTimeRequest): Promise<TunnelTimeResponse[]>;
}

// Reads manager metrics from a Prometheus instance.
export class PrometheusManagerMetrics implements ManagerMetrics {
  constructor(private prometheusClient: PrometheusClient) {}

  async getOutboundByteTransfer(timeframe: DataUsageTimeframe): Promise<DataUsageByUser> {
    // TODO(fortuna): Consider pre-computing this to save server's CPU.
    // We measure only traffic leaving the server, since that's what DigitalOcean charges.
    // TODO: Display all directions to admin
    const result = await this.prometheusClient.query(
      `sum(increase(shadowsocks_data_bytes{dir=~"c<p|p>t"}[${timeframe.hours}h])) by (access_key)`
    );
    const usage = {} as {[userId: string]: number};
    for (const entry of result.result) {
      const bytes = Math.round(parseFloat(entry.value[1]));
      if (bytes === 0) {
        continue;
      }
      usage[entry.metric['access_key'] || ''] = bytes;
    }
    return {bytesTransferredByUserId: usage};
  }

  async getTunnelTimeByLocation({
    time_window: {seconds},
  }: TunnelTimeRequest): Promise<TunnelTimeResponse[]> {
    const {result} = await this.prometheusClient.query(
      `sum(increase(shadowsocks_tunnel_time_seconds_per_location[${seconds}s])) by (location, asn, asorg)`
    );

    return result.map((entry) => ({
      location: entry.metric['location'],
      asn: entry.metric['asn'] !== undefined ? parseInt(entry.metric['asn'], 10) : undefined,
      as_org: entry.metric['asorg'],
      tunnel_time: {
        seconds: Math.round(parseFloat(entry.value[1])),
      },
    }));
  }
}
