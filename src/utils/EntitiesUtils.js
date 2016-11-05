/*
  Copyright 2015 Skippbox, Ltd

  Licensed under the Apache License, Version 2.0 (the 'License');
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an 'AS IS' BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

export default class EntitiesUtils {

  static storeForType(entityType) {
    let find;
    for (const key in alt.stores) {
      if (alt.stores.hasOwnProperty(key)) {
        const store = alt.stores[key];
        if (store.getEntityType && store.getEntityType() === entityType) {
          find = store;
        }
      }
    }
    return find;
  }

  static newDeploymentParams({name, image, namespace = 'default', args = {}}) {
    return Immutable.fromJS({
      kind: 'Deployment',
      apiVersion: 'extensions/v1beta1',
      metadata: { name, namespace, labels: {run: name} },
      spec: {
        replicas: 1,
        selector: { matchLabels: {run: name}},
        template: {
          metadata: { labels: {run: name}},
          spec: { containers: [
            {name, image, resources: {}, args},
          ]},
        },
        strategy: {},
      },
      status: {},
    });
  }

  static newServiceParams({port, name, type = 'ClusterIP', labels = {}, selector, deployment}) {
    port = parseInt(port, 10);
    let serviceParams = Immutable.fromJS({
      kind: 'Service',
      apiVersion: 'v1',
      metadata: {name, labels},
      spec: {
        ports: port ? [{protocol: 'TCP', port, targetPort: port}] : [],
        selector: selector ? selector : {},
        type,
      },
      status: {loadBalancer: {}},
    });
    if (deployment) {
      const deploymentName = deployment.getIn(['metadata', 'name']);
      serviceParams = serviceParams.setIn(['metadata', 'labels', 'run'], deploymentName)
        .setIn(['spec', 'selector', 'run'], deploymentName);
    }
    return serviceParams;
  }

  static newSecretParams({name, data}) {
    return Immutable.fromJS({
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {name},
      data,
    });
  }

  static statusForEntity(entity) {
    const { Status } = Constants;
    let status = entity.get('status');
    if (typeof status === 'object') {
      if (status.get('phase')) {
        status = status.get('phase').toUpperCase();
      } else if (status.get('conditions')) {
        const condition = status.get('conditions').find(c => c.get('type') === 'Ready');
        status = condition.get('status') === 'True' ? Status.READY : Status.NOTREADY;
        if (status === Status.READY && entity.get('kind') === 'nodes' && entity.getIn(['spec', 'unschedulable'])) {
          status = Status.READY_UNSCHEDULABLE;
        }
      }
    }
    return status;
  }

  static nodeUrlForCluster(cluster) {
    const nodes = alt.stores.NodesStore.getAll(cluster);
    const readyNodes = nodes.filter(node => {
      return node.getIn(['status', 'conditions']).find(c => c.get('type') === 'Ready').get('status') === 'True';
    });
    const ready = readyNodes.find(node => {
      return node.getIn(['spec', 'externalID']);
    });
    return ready ? ready.getIn(['spec', 'externalID']) : cluster.get('url').split(':')[0];
  }

  static spartakusArgs() {
    const generatedId = new Date().valueOf() + Math.random().toFixed(8).substring(2) + '-cabin';
    return ['volunteer', `--cluster-id=${generatedId}`];
  }
}
