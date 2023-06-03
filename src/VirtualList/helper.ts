import type { ItemSize, SizeAndPosition } from './size-and-position-manager'
import { DIRECTION, sizeProp, positionProp } from './constants'
import { ItemStyle } from './interface'

export function itemSizeGetter(itemSize: ItemSize) {
  function getSize(index: number) {
    if (typeof itemSize === 'function') {
      return itemSize(index);
    }

    return Array.isArray(itemSize) ? itemSize[index] : itemSize;
  }

  return (index: number) => getSize(index);
}

export function getEstimatedItemSize(itemSize: ItemSize, estimatedItemSize?: number) {
  return (
    estimatedItemSize ||
    (typeof itemSize === 'number' && itemSize) ||
    50
  );
}

type SupplementStyleFunc = (index: number) => SizeAndPosition
interface StyleCacheOption {
  getSizeAndPosition: SupplementStyleFunc
}
export class StyleCache {
  private cache = new Map<number, ItemStyle>()
  private getSizeAndPosition: SupplementStyleFunc

  constructor({ getSizeAndPosition }: StyleCacheOption) {
    this.getSizeAndPosition = getSizeAndPosition;
  }

  getStyle(index: number, scrollDirection = DIRECTION.VERTICAL) {
    const oldStyle = this.cache.get(index);
    if (oldStyle) {
      return oldStyle;
    }

    const { size, offset } = this.getSizeAndPosition(index);

    const newStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      [sizeProp[scrollDirection]]: size, // height or width
      [positionProp[scrollDirection]]: offset, // top or left
    }

    this.cache.set(index, newStyle);
    return newStyle
  }
  reset() {
    this.cache.clear()
  }
}