interface UrlDataParams {
  isLK?: boolean;
  [key: string]: unknown;
}

/**
 * Получает параметр из URL search string
 */
function getParameterFromUrl(parameterName: string, search?: string): string | null {
  const parameters = search || window.location.search.substr(1) || (window.parent?.location?.search?.substr(1) ?? '');
  const items = parameters.split('&');
  for (let i = 0; i < items.length; i++) {
    const [name, value] = items[i].split('=');
    if (name === parameterName) {
      const result = decodeURIComponent(value || '');
      return result === 'null' ? null : result;
    }
  }
  return null;
}

/**
 * Парсит параметр data из URL (JSON) и возвращает объект с параметрами.
 * isLK по умолчанию true - если параметр не указан или парсинг не удался.
 */
export function getUrlDataParams(): UrlDataParams {
  const dataParam = getParameterFromUrl('data');
  if (!dataParam) {
    return { isLK: true };
  }
  try {
    const parsed = JSON.parse(dataParam) as UrlDataParams;
    return {
      ...parsed,
      isLK: parsed.isLK !== false,
    };
  } catch {
    return { isLK: true };
  }
}

/**
 * Возвращает значение isLK из URL параметров.
 * По умолчанию true.
 */
export function getIsLK(): boolean {
  const params = getUrlDataParams();
  return params.isLK !== false;
}
