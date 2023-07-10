import { Rule, Declaration } from 'postcss'
import cssVars from './cssVars'
import type { IStyleHandlerOptions } from '@/types'

const initialNodes = cssVars.map((x) => {
  return new Declaration({
    prop: x.prop,
    value: x.value
  })
})
// ':not(template) ~ :not(template)'
// ':not(template)~:not(template)'
// const regexp1 = /:not\(template\)\s*~\s*:not\(template\)/g
// :not([hidden])~:not([hidden])
// :not([hidden]) ~ :not([hidden])
// const regexp2 = /:not\(\[hidden\]\)\s*~\s*:not\(\[hidden\]\)/g

/**
 * 带有子选择器的
 * https://tailwindcss.com/docs/space
 * .space-x-4>:not([hidden])~:not([hidden])
 *
 * https://tailwindcss.com/docs/divide-width
 * .divide-x>:not([hidden])~:not([hidden])
 *
 * https://tailwindcss.com/docs/divide-color
 * .divide-blue-200>:not([hidden])~:not([hidden])
 * :is(.dark .dark\:divide-slate-700)>:not([hidden])~:not([hidden])
 *
 * https://tailwindcss.com/docs/divide-style
 * .divide-dashed>:not([hidden])~:not([hidden])
 *
 * 其中小程序里直接写
 * .divide-y-4>:not(hidden) + :not(hidden)
 * 会语法错误
 */

// eslint-disable-next-line unicorn/better-regex
const PATTERNS = [/:not\(template\)\s*~\s*:not\(template\)/.source, /:not\(\[hidden\]\)\s*~\s*:not\(\[hidden\]\)/.source].join('|')
const BROAD_MATCH_GLOBAL_REGEXP = new RegExp(PATTERNS, 'g')

export function testIfVariablesScope(node: Rule, count = 1): boolean {
  if (/:?:before/.test(node.selector) && /:?:after/.test(node.selector)) {
    for (let i = 0; i < count; i++) {
      const tryTestDecl = node.nodes[i]
      if (tryTestDecl && tryTestDecl.type === 'decl' && tryTestDecl.prop.startsWith('--tw-')) {
        continue
      } else {
        return false
      }
    }
    return true
  }
  return false
}

export function testIfTwBackdrop(node: Rule, count = 1) {
  if (node.type === 'rule' && node.selector === '::backdrop') {
    for (let i = 0; i < count; i++) {
      const tryTestDecl = node.nodes[i]
      if (tryTestDecl && tryTestDecl.type === 'decl' && tryTestDecl.prop.startsWith('--tw-')) {
        continue
      } else {
        return false
      }
    }
    return true
  }
  return false
}

export function makePseudoVarRule() {
  const pseudoVarRule = new Rule({
    // selectors: ['::before', '::after'],
    selector: '::before,::after'
  })
  pseudoVarRule.append(
    new Declaration({
      prop: '--tw-content',
      value: '""'
    })
  )
  return pseudoVarRule
}

export function remakeCssVarSelector(selector: string, cssPreflightRange: IStyleHandlerOptions['cssPreflightRange']) {
  // node.selector = node.selector.replace(/\*/g, 'view')
  const selectorParts = selector.split(',')
  // 没有 view 元素时，添加 view
  if (!selectorParts.includes('view')) {
    selectorParts.push('view')
  }
  if (
    cssPreflightRange === 'all' && // 默认对每个元素都生效
    !selectorParts.includes(':not(not)')
  ) {
    selectorParts.push(':not(not)')
  }

  return selectorParts.join(',')
}

export function remakeCombinatorSelector(selector: string, cssChildCombinatorReplaceValue: IStyleHandlerOptions['cssChildCombinatorReplaceValue']) {
  let childCombinatorReplaceValue = 'view + view'
  if (Array.isArray(cssChildCombinatorReplaceValue)) {
    const part = cssChildCombinatorReplaceValue.join(',')
    childCombinatorReplaceValue = [part, ' + ', part].join('')
  } else if (typeof cssChildCombinatorReplaceValue === 'string') {
    childCombinatorReplaceValue = cssChildCombinatorReplaceValue
  }
  return selector.replaceAll(BROAD_MATCH_GLOBAL_REGEXP, childCombinatorReplaceValue)
}

export function remakeRuleNode(node: Rule, options: IStyleHandlerOptions) {
  node.selector = remakeCssVarSelector(node.selector, options.cssPreflightRange)

  // node.walkDecls((decl) => {
  //   // remove empty var 来避免压缩css报错
  //   if (/^\s*$/.test(decl.value)) {
  //     decl.remove()
  //   }
  //   //  console.log(decl.prop, decl.value)
  // })

  // preset
  if (typeof options.cssInjectPreflight === 'function') {
    node.append(...options.cssInjectPreflight())
  }
  node.before(makePseudoVarRule())
}

export function commonChunkPreflight(node: Rule, options: IStyleHandlerOptions) {
  node.selector = remakeCombinatorSelector(node.selector, options.cssChildCombinatorReplaceValue)

  // 变量注入和 preflight
  if (testIfVariablesScope(node)) {
    remakeRuleNode(node, options)
  }
  if (options.injectAdditionalCssVarScope && testIfTwBackdrop(node)) {
    const syntheticRule = new Rule({
      selectors: ['*', '::after', '::before'],
      nodes: initialNodes
    })
    remakeRuleNode(syntheticRule, options)

    node.before(syntheticRule)
  }
}
