const VALIDATION_INTERVAL = 5000 // 5 seconds
const API_KEY = 'replace-this-with-your-own-api-key'
const NAME_STR_REG_EXP = /^Confirm that the payment is from (.*) \(buyer's name\).$/
const SEVERAL_SPACES_REG_EXP = /\s+/g
const VALIDATION_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
}
const STATUS_TO_COLOR = {
  [VALIDATION_STATUS.VALID]: 'lightgreen',
  [VALIDATION_STATUS.NOT_FOUND]: 'green', // yellow
  [VALIDATION_STATUS.INVALID]: 'red',
  [VALIDATION_STATUS.ERROR]: 'lightgrey',
}
const INVALID_SOURCE_TYPES = [
  'SANCTION',
  'PEP',
  'CRIMINAL',
]
const validatedNames = {}

main()
setInterval(main, VALIDATION_INTERVAL)

async function main () {
  const { nameEl, name, content } = findNameElement()

  if (!nameEl) {
    console.info('Name element not found in HTML')
    return
  }

  if (isAlreadyValidated(name)) {
    highlightName(nameEl, name, content, validatedNames[name])
    return
  }

  const status = await validateName(name)

  highlightName(nameEl, name, content, status)
  validatedNames[name] = status
}

function findNameElement () {
  const el = document.querySelector('#order-detail-container > div:nth-child(2) [data-bn-type="text"]')
  const content = el?.textContent?.trim()?.replaceAll(SEVERAL_SPACES_REG_EXP, ' ')
  const match = content?.match(NAME_STR_REG_EXP)

  if (Array.isArray(match) && match.length === 2) {
    return {
      nameEl: el,
      name: match[1],
      content,
    }
  }

  return {}
}

function isAlreadyValidated (name) {
  return Boolean(validatedNames?.[name])
}

async function validateName (name) {
  try {
    const data = await apiCall(name)

    if (data?.total_hits === 0) {
      return VALIDATION_STATUS.NOT_FOUND
    }

    if (
      Array.isArray(data?.found_records)
      && data.found_records?.length > 0
      && INVALID_SOURCE_TYPES.includes(data.found_records[0]?.source_type)
    ) {
      return VALIDATION_STATUS.INVALID
    }
  } catch (error) {
    console.error(error)
    return VALIDATION_STATUS.ERROR
  }

  return VALIDATION_STATUS.VALID
}

async function apiCall (name) {
  try {
    const response = await fetch(`https://api.dilisense.com/v1/checkIndividual?names=${name}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
      },
      redirect: 'follow'
    })

    console.info(`API call made`)

    if (response.ok) {
      return response.json()
    }

    return Promise.reject(new Error(`Bad API request: ${response.status} ${response.statusText}`))
  } catch (error) {
    return Promise.reject(new Error(`Can not fetch data from API: ${error.message}`))
  }
}

function highlightName (nameElement, name, content, status) {
  const highlightedContent = content.replace(name, `<span style="background-color: ${STATUS_TO_COLOR[status]}">${name}</span>`)

  nameElement.innerHTML = highlightedContent
}