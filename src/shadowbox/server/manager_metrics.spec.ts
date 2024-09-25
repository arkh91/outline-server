// Copyright 2019 The Outline Authors
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

import {PrometheusManagerMetrics} from './manager_metrics';
import {
  FakeDataBytesTransferredPrometheusClient,
  FakeTunnelTimePrometheusClient,
} from './mocks/mocks';

describe('PrometheusManagerMetrics', () => {
  it('getOutboundByteTransfer', async (done) => {
    const managerMetrics = new PrometheusManagerMetrics(
      new FakeDataBytesTransferredPrometheusClient({'access-key-1': 1000, 'access-key-2': 10000})
    );
    const dataUsage = await managerMetrics.getOutboundByteTransfer({hours: 0});
    const bytesTransferredByUserId = dataUsage.bytesTransferredByUserId;
    expect(Object.keys(bytesTransferredByUserId).length).toEqual(2);
    expect(bytesTransferredByUserId['access-key-1']).toEqual(1000);
    expect(bytesTransferredByUserId['access-key-2']).toEqual(10000);
    done();
  });

  it('getTunnelTimeByLocation', async (done) => {
    const managerMetrics = new PrometheusManagerMetrics(
      new FakeTunnelTimePrometheusClient({US: {1: 1000, 2: 1000}, CA: {3: 2000}})
    );
    const tunnelTime = await managerMetrics.getTunnelTimeByLocation({time_window: {seconds: 0}});
    expect(tunnelTime).toEqual([
      {location: 'US', asn: 1, as_org: undefined, tunnel_time: {seconds: 1000}},
      {location: 'US', asn: 2, as_org: undefined, tunnel_time: {seconds: 1000}},
      {location: 'CA', asn: 3, as_org: undefined, tunnel_time: {seconds: 2000}},
    ]);
    done();
  });
});
