import React, { useRef, useState, useEffect, useCallback } from 'react'
import SizeAndPositionManager, { ItemSize } from './size-and-position-manager';
import { itemSizeGetter, getEstimatedItemSize, StyleCache } from './helper'
import { ItemStyle } from './interface'
import {
  ALIGNMENT,
  DIRECTION,
  SCROLL_CHANGE_REASON,
  scrollProp,
  sizeProp,
} from './constants';

interface RenderedRows {
  startIndex: number;
  stopIndex: number;
}

interface ItemInfo {
  index: number;
  style: ItemStyle;
}

interface Props {
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

const VirtualualList = (props: Props) => {
  const { itemSize, itemCount, estimatedItemSize, scrollToIndex, scrollToAlignment, 
    scrollOffset, scrollDirection = DIRECTION.VERTICAL, onScroll } = props;
  const [offset, setOffset] = useState(0);

  const rootNode = useRef<HTMLDivElement>(null);
  const scrollChangeReason = useRef(SCROLL_CHANGE_REASON.REQUESTED);
  const sizeAndPositionManagerRef = useRef(new SizeAndPositionManager({
    itemCount,
    itemSizeGetter: itemSizeGetter(itemSize),
    estimatedItemSize: getEstimatedItemSize(itemSize, estimatedItemSize),
  }));
  const sizeAndPositionManager = sizeAndPositionManagerRef.current
  const styleCacheRef = useRef<StyleCache>(
    new StyleCache({ 
      getSizeAndPosition: sizeAndPositionManager.getSizeAndPositionForIndex.bind(sizeAndPositionManager)
    }
  ));

  // the value of width or height
  const getContainerSize = () => props[sizeProp[scrollDirection]];
  // the value of scrollTop or scrollLeft
  const getNodeOffset = () => (rootNode.current?.[scrollProp[scrollDirection]] || 0);

  // 防止与scrollTo重名
  const _scrollTo = useCallback((value: number) =>  {
    if (rootNode.current) {
      rootNode.current[scrollProp[scrollDirection]] = value
    }
  }, [scrollDirection]);

  const getOffsetForIndex = useCallback(function getOffsetForIndex(
    index: number,
    _scrollToAlignment = scrollToAlignment,
    _itemCount: number = itemCount,
  ): number {
    if (index < 0 || index >= _itemCount) {
      index = 0;
    }

    return sizeAndPositionManager.getUpdatedOffsetForIndex({
      align: _scrollToAlignment,
      containerSize: getContainerSize(),
      currentOffset: offset || 0,
      targetIndex: index,
    });
  }, [scrollToAlignment, itemCount, offset]);

  const handleScroll = useCallback((event: Event) => {
    const newOffset = getNodeOffset();
    console.log('tao', newOffset)

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
  }, [onScroll])
  
  useEffect(function init() {
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

  useEffect(function updateItemSizeGetter() {
    sizeAndPositionManager.updateConfig({
      itemSizeGetter: itemSizeGetter(itemSize),
    });
  }, [itemSize])

  const lastItemCount = useRef(itemCount)
  useEffect(function updateItemCountOrEstimatedItemSize() {
    const isItemCountChanged = lastItemCount.current !== itemCount
    sizeAndPositionManager.updateConfig({
      itemCount: isItemCountChanged ? itemCount : undefined,
      estimatedItemSize: getEstimatedItemSize(itemSize, estimatedItemSize), // 任何deps变化，都要更新estimatedItemSize
    });
  }, [itemCount, estimatedItemSize, itemSize])

  const itemPropsDeps = [itemCount, itemSize, estimatedItemSize]
  useEffect(function recomputeSizes(startIndex = 0) {
    // todo: 此方法可暴露给外部使用
    styleCacheRef.current.reset()
    sizeAndPositionManager.resetItem(startIndex);
  }, itemPropsDeps)

  const lastScrollOffset = useRef(scrollOffset)
  useEffect(function updateOffset() {
    if (lastScrollOffset.current !== scrollOffset) {
      lastScrollOffset.current = scrollOffset
      setOffset(scrollOffset || 0)
      scrollChangeReason.current = SCROLL_CHANGE_REASON.REQUESTED
      return
    }

    // 其他deps改变，保持滚动位置为当前的item(index)
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

  const renderItems = () => {
    const { renderItem, onItemsRendered, overscanCount = 3, } = props
    const items: React.ReactNode[] = [];
    const { start, stop } = sizeAndPositionManager.getVisibleRange({
      containerSize: Number(props[sizeProp[scrollDirection]]) || 0,
      offset,
      overscanCount,
    });
    if (typeof start !== 'undefined' && typeof stop !== 'undefined') {
      for (let index = start; index <= stop; index++) {
        items.push(
          renderItem({
            index,
            style: styleCacheRef.current.getStyle(index, scrollDirection),
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
    return items
  }
  const renderInner = () => {
    const innerStyle = {
      ...STYLE_INNER,
      [sizeProp[scrollDirection]]: sizeAndPositionManager.getTotalSize(),
    };
    return <div style={innerStyle}>{renderItems()}</div>
  }

  const { style, height, width } = props;
  const wrapperStyle = {...STYLE_WRAPPER, ...style, height, width};
  return (
    <div ref={rootNode} className={props.className} style={wrapperStyle}>
      {renderInner()}
    </div>
  )
}

export default VirtualualList;