import postcss from 'postcss'
import type { StyleHandlerOptions } from '../types'
import { mpRulePreflight, commonChunkPreflight } from './mp'
// mpAtRulePreflight
const isMp = true
export function styleHandler (
  rawSource: string,
  options: StyleHandlerOptions = {}
) {
  const root = postcss.parse(rawSource)
  // console.log(file)
  root.walk((node, idx) => {
    if (node.type === 'rule') {
      if (isMp) {
        // 引用传递
        // uni-app common-> main.wxss
        // taro app.wxss
        if (options.isMainChunk) {
          commonChunkPreflight(node)
        }
        mpRulePreflight(node)
      }
    }
    //  else if (node.type === 'atrule') {
    //   if (isMp) {
    //     mpAtRulePreflight(node)
    //   }
    // }
    // 顺其自然
    // else if (node.type === 'comment') {
    //   node.remove()
    // }
  })
  return root.toString()
}
