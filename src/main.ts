import { engine } from './engine/instance'
import { bridgeEngineToStores } from './stores/bridge'
import './ui/sf-app'
import { App } from './ui/App'

bridgeEngineToStores(engine)

const root = document.getElementById('app')
if (root) {
  new App(root)
}
