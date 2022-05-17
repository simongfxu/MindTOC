import React, {
  ReactElement,
  useCallback,
  useReducer,
  useEffect,
  useRef
} from 'react'
import { createRoot } from 'react-dom/client'
import { useHash } from 'react-use'
import Color from 'color'

import { CONTAINER_ID, SEMANTIC_HEADINGS } from './types/constants'
import searchContentRoot from './lib/search'
import { extract } from './lib/extract'
import getInitialPosition from './utils/offset'
import reducer, { defaultState, Actions } from './reducer'

import './styles/index.css'

let host = document.querySelector(`#${CONTAINER_ID}`)
if (!host) {
  host = document.createElement('div')
  host.setAttribute('id', CONTAINER_ID)
  document.body.appendChild(host)
}
const root = createRoot(host)
root.render(<Widget />)

const observer = new MutationObserver((mutationList, instance) => {
  for (let index = 0; index < mutationList.length; index++) {
    const element = mutationList[index]
    console.log(element)
    if (element.type === 'childList') {
      instance.disconnect()
      root.render(<Widget />)
      return
    }
  }
})

function Widget(): ReactElement {
  const [hash] = useHash()
  // const { pathname, hash } = useLocation()
  const selectedRef = useRef<HTMLDivElement | null>(null)
  const [state, dispatch] = useReducer(reducer, defaultState)
  const { headings, top, left, selectedIndex, visible } = state
  const onItemClick = useCallback((e: React.SyntheticEvent<HTMLElement>) => {
    dispatch({
      type: Actions.SELECT_ITEM,
      payload: parseFloat(e.currentTarget?.dataset.id as string)
    })
  }, [])
  const render = useCallback(() => {
    const rootNode = searchContentRoot(document)
    const titleNode = document.querySelector(SEMANTIC_HEADINGS.join(','))
    console.log({ rootNode })
    if (rootNode) {
      const offset = getInitialPosition(rootNode, titleNode)
      const headings = extract(rootNode)
      console.log({ headings })
      if (headings.length) {
        /**
         * User may change theme at any time
         * matchMedia('(prefers-color-scheme: dark)').matches does not work in content.js
         */
        const isDark = Color(
          getComputedStyle(
            document.querySelector('#' + headings[0].anchor) as HTMLElement
          ).color
        ).isDark()
        if (!isDark) {
          document.documentElement.classList.add('dark')
        }
        observer.observe(rootNode, { childList: true })
        dispatch({
          type: Actions.INIT,
          payload: {
            headings,
            ...offset
          }
        })
        return
      }
    }

    dispatch({
      type: Actions.CHANGE_STATUS,
      payload: false
    })
  }, [])

  /**
   * When location changed by pushState or replaceState, we need to re-render
   */
  useEffect(() => {
    render()
  }, [render])

  /**
   * When use interacts with original anchors, automatically scrolls to widget heading
   */
  useEffect(() => {
    const index = headings.findIndex((i) => '#' + i.anchor === hash)
    dispatch({
      type: Actions.SELECT_ITEM,
      payload: index
    })
    selectedRef.current?.scrollIntoView()
  }, [hash, headings])

  return (
    <div
      className={`content_wrapper ${visible ? '' : 'hidden'}`}
      style={{ top: top + 'px', left: left + 'px' }}
    >
      <div className="content_title">Table of Contents</div>
      <div className="content_list">
        {headings.map((heading) => (
          <div
            ref={'#' + heading.anchor === hash ? selectedRef : null}
            key={heading.id}
            data-level={heading.indentLevel}
            data-id={heading.id}
            data-selected={selectedIndex === heading.id}
            className="content_list_item"
            onClick={onItemClick}
          >
            <a href={`#${heading.anchor}`}>{heading.text}</a>
          </div>
        ))}
      </div>
    </div>
  )
}
