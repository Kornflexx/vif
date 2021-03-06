import VifReconcilier from '../../vif-reconciler'
import { getDiffObject } from '../../vif-utils'
import Vif from '../../vif'
const { Children } = Vif;

function eventProxy(event) {
    event.currentTarget.events[event.type](event)
}

export function updateAttribute(element, name, lastValue, nextValue) {
    if (name === 'children' || name === 'key') {
    } else if (name === 'value' || name === 'checked') {
        element[name] = nextValue
    } else {
        if (name.indexOf('on') === 0) {
            const eventType = name.slice(2).toLowerCase()
            element.events[eventType] = nextValue
            if (typeof lastValue === 'function') {
                if (typeof nextValue !== 'function') {
                    element.removeEventListener(eventType, eventProxy)
                }
            } else if (typeof nextValue === 'function') {
                element.addEventListener(eventType, eventProxy)
            }
        } else if (name === 'className') {
            if (!nextValue) {
                element.removeAttribute('class')
            } else {
                element.setAttribute('class', nextValue)
            }
        } else if (name === 'style') {
            const diffObject = getDiffObject(lastValue, nextValue)
            const nextStyle = typeof nextValue === 'object'
                ? nextValue
                : {}

            for (const propKey in diffObject) {
                if (propKey[0] === '-') {
                    if (diffObject[propKey]) {
                        element.style.setProperty(propKey, nextStyle[propKey])
                    } else {
                        element.style.removeProperty(propKey)
                    }
                } else {
                    element.style[propKey] = nextStyle[propKey]
                }
            }
        } else {
            if (nextValue === undefined) {
                element.removeAttribute(name)
            } else {
                element.setAttribute(name, nextValue)
            }
        }
    }
}

export function insert(parentElement, element, siblingElement) {
    parentElement.insertBefore(element, siblingElement)
}

export function append(parentElement, element) {
    parentElement.append(element)
}

export function remove(parentElement, element) {
    parentElement.removeChild(element)
}

export function create(node) {
    const element = node.isText
        ? document.createTextNode(node.value)
        : document.createElement(node.name)

    const { props } = node
    element.events = {}
    for (const propKey in props) {
        updateAttribute(element, propKey, null, props[propKey])
    }

    return element
}

export function setTextContent(element, textContent) {
    element.textContent = textContent
}

export function render(node, container, patching, nextElement, ref) {
    if (node.isGhost) {
        for (let i = 0; i < node.children.length; i++) {
            if (node.children[i]) {
                render(
                    node.children[i],
                    container,
                    patching,
                    nextElement
                )
            }
        }
    } else if (node.isComponent) {
        const childProp = Children.getChildrenProp(
            node._props.children,
            node._children
        )
        const props = { ...node.props, children: childProp }
        const child = node.name(props, node.state)
        const children = [child]
        Children.applyChildren(children)
        node.children = children
        if (!patching) {
            VifReconcilier.lifecycle.mountComponent(node)
        }
        node._ref = render(
            child,
            container,
            patching,
            nextElement
        )
    } else {
        const children = node.children
        const element = node._ref = ref || create(node)
        if (children) {
            for (let i = 0; i < children.length; i++) {
                if (children[i]) {
                    render(
                        children[i],
                        element,
                        patching
                    )
                }
            }
        }
        if (nextElement) {
            container.insertBefore(element, nextElement)
        } else {
            container.appendChild(element)
        }
        return element
    }
}