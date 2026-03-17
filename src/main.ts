import { engine } from './engine/instance'
import { bridgeEngineToStores } from './stores/bridge'
import './ui/sf-app'

bridgeEngineToStores(engine)

const root = document.getElementById('app')
if (root) {
  const app = document.createElement('sf-app')
  root.appendChild(app)
}
