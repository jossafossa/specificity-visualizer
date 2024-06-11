import '../styles/main.scss'

import naturalSort from 'javascript-natural-sort'
import uniq from 'lodash/uniq'
import indexOf from 'lodash/indexOf'
import postcss from 'postcss'
import { specificity } from 'parsel-js'

import {
  renderMainChart,
  renderSpecificityGroupsColumnChart,
  renderSpecificityGroupsPieChart,
} from './charts/index.js'

const classFormErrorHidden = 'form__error_hidden'
const classChartsHidden = 'charts_hidden'

const selectorForm = '.js-form'
const selectorTextarea = '.js-form-textarea'
const selectorErrorMessage = '.js-form-error'
const selectorCharts = '.js-charts'

const elementForm = document.querySelector(selectorForm)
const elementTextarea = document.querySelector(selectorTextarea)
const elementErrorMessage = document.querySelector(selectorErrorMessage)
const elementCharts = document.querySelector(selectorCharts)

let mainChartDataSeries
let specificityUsages
let specificityUsagesDataSeries
let textareaContent
let ast
let specificities
let mainChartYAxisCategories

const isValidAtRule = (rule) =>
  rule.parent.type === 'atrule' && ['media', 'supports', 'document'].includes(rule.parent.name)

const isValidSelector = (rule) => rule.parent.type === 'root' || isValidAtRule(rule)

// build up array with all valid selectors
const getAllSelectors = () => {
  const selectors = []

  ast.walkRules((rule) => {
    if (isValidSelector(rule)) {
      selectors.push(...rule.selectors.filter((item) => item !== ''))
    }
  })

  return selectors
}

// fill the elementTextarea with the css from the url
const fillTextareaFromUrl = async (url) => {
  const response = await fetch(url)
  const data = await response.text()
  elementTextarea.value = data;
  return data;
}

// get css url from the url params
const urlParams = new URLSearchParams(window.location.search);
const cssUrl = urlParams.get('url');
if (cssUrl) {
  (async () => {
    await fillTextareaFromUrl(cssUrl);
    visualize();
  })();
}

const getSortedKeysByValue = (obj) =>
  Object.keys(obj).sort((keyA, keyB) => -(obj[keyA] - obj[keyB]))

const visualize = () => {
  // reset variables
  mainChartDataSeries = {
    idCategory: [],
    classCategory: [],
    elementCategory: [],
  }
  specificityUsages = {}

  textareaContent = elementTextarea.value

  if (textareaContent.trim() === '') {
    elementErrorMessage.classList.remove(classFormErrorHidden)
    return
  }

  try {
    ast = postcss.parse(textareaContent)
  } catch (error) {
    if (error.name === 'CssSyntaxError') {
      elementErrorMessage.classList.remove(classFormErrorHidden)
      return
    }
  }

  // data is valid, make charts visible
  elementCharts.classList.remove(classChartsHidden)
  elementErrorMessage.classList.add(classFormErrorHidden)

  // calculate data for main chart
  specificities = getAllSelectors().map((selector) => {
    let specificities;
    try {
      specificities = specificity(selector);
    } catch(error) {
      console.warn(`Could not parse selector: "${selector}"`);
      return;
    }
    return {
      selector,
      specificity: specificities.join(),
    }
  })

  // filter out specificity values that are not valid
  specificities = specificities.filter((element) => element)

  mainChartYAxisCategories = uniq(specificities.map((element) => element.specificity)).sort(
    naturalSort,
  )

  specificities.forEach((element, index) => {
    if (element.specificity.indexOf('0,0,') === 0) {
      mainChartDataSeries.elementCategory.push([
        index,
        indexOf(mainChartYAxisCategories, element.specificity),
      ])
    } else if (element.specificity.indexOf('0,') === 0) {
      mainChartDataSeries.classCategory.push([
        index,
        indexOf(mainChartYAxisCategories, element.specificity),
      ])
    } else {
      mainChartDataSeries.idCategory.push([
        index,
        indexOf(mainChartYAxisCategories, element.specificity),
      ])
    }

    specificityUsages[element.specificity] = (specificityUsages[element.specificity] || 0) + 1
  })

  specificityUsagesDataSeries = getSortedKeysByValue(specificityUsages).map((element) => {
    return {
      name: element,
      y: specificityUsages[element],
    }
  })

  renderMainChart(specificities, mainChartYAxisCategories, mainChartDataSeries)
  renderSpecificityGroupsColumnChart(specificityUsagesDataSeries)
  renderSpecificityGroupsPieChart(specificityUsagesDataSeries)
}

// main form submit
elementForm.addEventListener('submit', (event) => {
  event.preventDefault()
  visualize();
})
