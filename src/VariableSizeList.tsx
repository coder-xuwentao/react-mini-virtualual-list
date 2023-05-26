import React, { useRef, useState, useEffect } from 'react'
import SizeAndPositionManager, { ItemSize } from './SizeAndPositionManager';
import {
  ALIGNMENT,
  DIRECTION,
  SCROLL_CHANGE_REASON,
  positionProp,
  scrollProp,
  sizeProp,
} from './constants';

export interface ItemStyle {
  top?: number;
  left: number;
  width: string | number;
  height?: number;
  marginTop?: number;
  marginLeft?: number;
  marginRight?: number;
  marginBottom?: number;
  zIndex?: number;
}

export interface RenderedRows {
  startIndex: number;
  stopIndex: number;
}

export interface ItemInfo {
  index: number;
  style: ItemStyle;
}

export interface Props {
  className?: string;
  estimatedItemSize?: number;
  height: number | string;
  itemCount: number;
  itemSize: ItemSize;
  overscanCount?: number;
  scrollOffset?: number;
  scrollToIndex?: number;
  scrollToAlignment?: ALIGNMENT;
  scrollDirection?: DIRECTION;
  style?: React.CSSProperties;
  width?: number | string;
  onItemsRendered?({ startIndex, stopIndex }: RenderedRows): void;
  onScroll?(offset: number, event: Event): void;
  renderItem(itemInfo: ItemInfo): React.ReactNode;
}

const STYLE_WRAPPER: React.CSSProperties = {
  overflow: 'auto',
  willChange: 'transform',
  WebkitOverflowScrolling: 'touch',
};

const STYLE_INNER: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  minHeight: '100%',
};

interface StyleCache {
  [key: string]: any
}

const VariableSizeList = (props: Props) => {
  const { itemSize, itemCount, estimatedItemSize, scrollToIndex, scrollToAlignment, scrollOffset } = props;
  const [offset, setOffset] = useState(
    scrollOffset ||
    (scrollToIndex != null &&
      getOffsetForIndex(scrollToIndex)) ||
    0);
  const rootNode = useRef<HTMLDivElement>(null);
  const scrollChangeReason = useRef(SCROLL_CHANGE_REASON.REQUESTED);
  const styleCache = useRef<StyleCache>({})
  const sizeAndPositionManager = useRef(new SizeAndPositionManager({
    itemCount,
    itemSizeGetter: itemSizeGetter(itemSize),
    estimatedItemSize: getEstimatedItemSize(),
  }));

  window.sizeAndPositionManager = sizeAndPositionManager

  const handleScroll = (event: Event) => {
    const {onScroll} = props;
    const newOffset = getNodeOffset();

    if (
      offset < 0 ||
      offset === newOffset ||
      event.target !== rootNode.current
    ) {
      return;
    }

    setOffset(newOffset)
    scrollChangeReason.current =  SCROLL_CHANGE_REASON.OBSERVED;

    if (typeof onScroll === 'function') {
      onScroll(offset, event);
    }
  }
  
  useEffect(function init() {
    const { scrollOffset, scrollToIndex } = props;
    if (scrollOffset != null) {
      _scrollTo(scrollOffset);
    } else if (scrollToIndex != null) {
      _scrollTo(getOffsetForIndex(scrollToIndex));
    }

    const rootNodeCurrent = rootNode.current
    rootNodeCurrent?.addEventListener('scroll', handleScroll, {
      passive: true,
    });
    return function destory() {
      rootNodeCurrent?.removeEventListener('scroll', handleScroll);
    }
  }, [])

  useEffect(function updateItemSize() {
    if (typeof itemSize === 'number') {
      console.warn('你可能不需要动态size组件。建议使用固定size组件 - FixedSizeList') 
    }
    sizeAndPositionManager.current.updateConfig({
      itemSizeGetter: itemSizeGetter(itemSize),
    });
  }, [itemSize])

  useEffect(function updateItemCountOrEstimatedItemSize() {
    sizeAndPositionManager.current.updateConfig({
      itemCount,
      estimatedItemSize: getEstimatedItemSize(),
    });
  }, [itemCount, estimatedItemSize])

  const itemPropsDeps = [itemCount, itemSize, estimatedItemSize]

  useEffect(function recomputeSizes(startIndex = 0) {
    // todo: 暴露为组件的方法
    styleCache.current = {};
    sizeAndPositionManager.current.resetItem(startIndex);
  }, itemPropsDeps)

  const lastScrollOffset = useRef(scrollOffset)
  useEffect(function updateOffset () {
    if (lastScrollOffset.current !== scrollOffset) {
      lastScrollOffset.current = scrollOffset
      setOffset(scrollOffset || 0)
      scrollChangeReason.current = SCROLL_CHANGE_REASON.REQUESTED
      return
    }

    if (typeof scrollToIndex === 'number') {
      setOffset(getOffsetForIndex(scrollToIndex, scrollToAlignment, itemCount))
      scrollChangeReason.current = SCROLL_CHANGE_REASON.REQUESTED
    }
  }, [...itemPropsDeps, scrollToIndex, scrollToAlignment, scrollOffset])

  useEffect(function scrollByOffset() {
    if (
      scrollChangeReason.current === SCROLL_CHANGE_REASON.REQUESTED
    ) {
      _scrollTo(offset);
    }
  }, [offset])

  // 防止与scrollTo重名
  function _scrollTo(value: number) {
    const { scrollDirection = DIRECTION.VERTICAL } = props;
    rootNode.current && (rootNode.current[scrollProp[scrollDirection]] = value);
  }

  function itemSizeGetter(itemSize: Props['itemSize']) {
    return (index: number) => getSize(index, itemSize);
  }

  function getEstimatedItemSize() {
    return (
      props.estimatedItemSize ||
      (typeof props.itemSize === 'number' && props.itemSize) ||
      50
    );
  }

  function getSize(index: number, itemSize: Props['itemSize']) {
    if (typeof itemSize === 'function') {
      return itemSize(index);
    }

    return Array.isArray(itemSize) ? itemSize[index] : itemSize;
  }

  function getOffsetForIndex(
    index: number,
    scrollToAlignment = props.scrollToAlignment,
    itemCount: number = props.itemCount,
  ): number {
    const { scrollDirection = DIRECTION.VERTICAL } = props;

    if (index < 0 || index >= itemCount) {
      index = 0;
    }

    return sizeAndPositionManager.current.getUpdatedOffsetForIndex({
      align: scrollToAlignment,
      containerSize: props[sizeProp[scrollDirection]],
      currentOffset: offset || 0,
      targetIndex: index,
    });
  }

  function getNodeOffset() {
    const {scrollDirection = DIRECTION.VERTICAL} = props;

    return rootNode.current?.[scrollProp[scrollDirection]] || 0;
  }

  function getStyle(index: number) {
    const oldStyle = styleCache.current[index];

    if (oldStyle) {
      return oldStyle;
    }
    
    const {scrollDirection = DIRECTION.VERTICAL} = props;
    const {
      size,
      offset,
    } = sizeAndPositionManager.current.getSizeAndPositionForIndex(index);

    const newStyle = {
      ...{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
      },
      [sizeProp[scrollDirection]]: size,
      [positionProp[scrollDirection]]: offset,
    }
    styleCache.current[index] = newStyle
    return newStyle
  }

  const { scrollDirection = DIRECTION.VERTICAL, overscanCount = 3, style, height, width, renderItem, onItemsRendered} = props;
  const { start, stop } = sizeAndPositionManager.current.getVisibleRange({
    containerSize: Number(props[sizeProp[scrollDirection]]) || 0,
    offset,
    overscanCount,
  });

  const items: React.ReactNode[] = [];
  const wrapperStyle = {...STYLE_WRAPPER, ...style, height, width};
  const innerStyle = {
    ...STYLE_INNER,
    [sizeProp[scrollDirection]]: sizeAndPositionManager.current.getTotalSize(),
  };

  if (typeof start !== 'undefined' && typeof stop !== 'undefined') {
    for (let index = start; index <= stop; index++) {
      items.push(
        renderItem({
          index,
          style: getStyle(index),
        }),
      );
    }

    if (typeof onItemsRendered === 'function') {
      onItemsRendered({
        startIndex: start,
        stopIndex: stop,
      });
    }
  }

  return (
    <div ref={rootNode} className={props.className} style={wrapperStyle}>
      <div style={innerStyle}>{items}</div>
    </div>
  )
}

export default VariableSizeList;