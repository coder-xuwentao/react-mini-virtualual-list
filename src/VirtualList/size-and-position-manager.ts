/* Forked from react-tiny-virtual-list which Forked from react-virtualized 💖 */
import { ALIGNMENT } from './constants';

export type ItemSizeGetter = (index: number) => number;
export type ItemSize = number | number[] | ItemSizeGetter;

export interface SizeAndPosition {
  size: number;
  offset: number;
}

interface SizeAndPositionData {
  [id: number]: SizeAndPosition;
}

export interface Options {
  itemCount: number;
  itemSizeGetter: ItemSizeGetter;
  estimatedItemSize: number;
}

export default class SizeAndPositionManager {
  private itemSizeGetter: ItemSizeGetter;
  private itemCount: number;
  private estimatedItemSize: number;
  private lastMeasuredIndex: number;
  private itemSizeAndPositionData: SizeAndPositionData;

  constructor({ itemCount, itemSizeGetter, estimatedItemSize }: Options) {
    this.itemSizeGetter = itemSizeGetter;
    this.itemCount = itemCount;
    this.estimatedItemSize = estimatedItemSize;

    // 缓存，值为位置和大小，key是index
    this.itemSizeAndPositionData = {};

    // 测量过的最后一个item（index），后面都是没测量的，可能需要预估
    this.lastMeasuredIndex = -1;
  }

  updateConfig({
    itemCount,
    itemSizeGetter,
    estimatedItemSize,
  }: Partial<Options>) {
    if (itemCount != null) {
      this.itemCount = itemCount;
    }

    if (estimatedItemSize != null) {
      this.estimatedItemSize = estimatedItemSize;
    }

    if (itemSizeGetter != null) {
      this.itemSizeGetter = itemSizeGetter;
    }
  }

  getLastMeasuredIndex() {
    return this.lastMeasuredIndex;
  }

  /**
   * 根据index,返回offset和size
   * 若index > lastMeasuredIndex，则说明没有缓存，需计算
   * 反之，从缓存中读取数据
   */
  getSizeAndPositionForIndex(index: number) {

    if (index < 0 || index >= this.itemCount) {
      throw Error(
        `Requested index ${index} is outside of range 0..${this.itemCount}`,
      );
    }

    if (index > this.lastMeasuredIndex) {
      const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
      let offset =
        lastMeasuredSizeAndPosition.offset + lastMeasuredSizeAndPosition.size;

      for (let i = this.lastMeasuredIndex + 1; i <= index; i++) {
        const size = this.itemSizeGetter(i);

        if (size == null || isNaN(size)) {
          throw Error(`Invalid size returned for index ${i} of value ${size}`);
        }

        this.itemSizeAndPositionData[i] = {
          offset,
          size,
        };

        offset += size;
      }

      this.lastMeasuredIndex = index;
    }
    return this.itemSizeAndPositionData[index];
  }

  // 获取lastMeasuredIndex的offset和size
  getSizeAndPositionOfLastMeasuredItem() {
    return this.lastMeasuredIndex >= 0
      ? this.itemSizeAndPositionData[this.lastMeasuredIndex]
      : { offset: 0, size: 0 };
  }

  /**
   * 获取总size：测量过的size + 预测的size
   */
  getTotalSize(): number {
    const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();

    return (
      lastMeasuredSizeAndPosition.offset +
      lastMeasuredSizeAndPosition.size +
      (this.itemCount - this.lastMeasuredIndex - 1) * this.estimatedItemSize
    );
  }

  /**
   * 获取一个offset - 用来确保item scroll到窗口中
   *
   * @param align item在窗口中的位置，eg: "start" (default), "center", or "end"
   * @param containerSize 窗口大小
   * @return Offset
   */
  getUpdatedOffsetForIndex({
    align = ALIGNMENT.START,
    containerSize,
    currentOffset,
    targetIndex,
  }: {
    align: ALIGNMENT | undefined;
    containerSize?: number | string;
    currentOffset: number;
    targetIndex: number;
  }): number {
    containerSize = Number(containerSize);
    if (containerSize === undefined || containerSize <= 0) {
      return 0;
    }

    const datum = this.getSizeAndPositionForIndex(targetIndex);
    const maxOffset = datum.offset;
    const minOffset = maxOffset - containerSize + datum.size;

    let idealOffset;

    switch (align) {
      case ALIGNMENT.END:
        idealOffset = minOffset;
        break;
      case ALIGNMENT.CENTER:
        idealOffset = maxOffset - (containerSize - datum.size) / 2;
        break;
      case ALIGNMENT.START:
        idealOffset = maxOffset;
        break;
      default:
        idealOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset));
    }

    const totalSize = this.getTotalSize();

    return Math.max(0, Math.min(totalSize - containerSize, idealOffset));
  }

  // 获取可视窗口返回开端，末尾两个item的索引（包括了缓冲部分）
  getVisibleRange({
    containerSize,
    offset,
    overscanCount,
  }: {
    containerSize: number;
    offset: number;
    overscanCount: number;
  }): { start?: number; stop?: number } {
    const totalSize = this.getTotalSize();

    if (totalSize === 0) {
      return {};
    }

    const maxOffset = offset + containerSize;
    let start = this.findNearestItem(offset);

    if (typeof start === 'undefined') {
      throw Error(`Invalid offset ${offset} specified`);
    }

    const datum = this.getSizeAndPositionForIndex(start);
    offset = datum.offset + datum.size;

    let stop = start;

    while (offset < maxOffset && stop < this.itemCount - 1) {
      stop++;
      offset += this.getSizeAndPositionForIndex(stop).size;
    }

    if (overscanCount) {
      start = Math.max(0, start - overscanCount);
      stop = Math.min(stop + overscanCount, this.itemCount - 1);
    }

    return {
      start,
      stop,
    };
  }

  /**
   * 清空指定item之后的测量值缓存
   * 下次调用getSizeAndPositionForIndex时，缓存的高度就只剩下这个了
   */
  resetItem(index: number) {
    this.lastMeasuredIndex = Math.min(this.lastMeasuredIndex, index - 1);
  }

  /**
   * 通过offset查找最近的item(index)
   * 找不到就返回最低offset的item
   */
  findNearestItem(offset: number) {
    if (isNaN(offset)) {
      throw Error(`Invalid offset ${offset} specified`);
    }

    offset = Math.max(0, offset);

    const lastMeasuredSizeAndPosition = this.getSizeAndPositionOfLastMeasuredItem();
    const lastMeasuredIndex = Math.max(0, this.lastMeasuredIndex);

    if (lastMeasuredSizeAndPosition.offset >= offset) {
      // 在已测量的items中，直接二分查找。
      return this.binarySearch({
        high: lastMeasuredIndex,
        low: 0,
        offset,
      });
    } else {
      // 有些还没测量，就先指数搜索-继续测量items直到测量值比offset大，再二分搜索
      return this.exponentialSearch({
        index: lastMeasuredIndex,
        offset,
      });
    }
  }

  private binarySearch({
    low,
    high,
    offset,
  }: {
    low: number;
    high: number;
    offset: number;
  }) {
    let middle = 0;
    let currentOffset = 0;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);
      currentOffset = this.getSizeAndPositionForIndex(middle).offset;

      if (currentOffset === offset) {
        return middle;
      } else if (currentOffset < offset) {
        low = middle + 1;
      } else if (currentOffset > offset) {
        high = middle - 1;
      }
    }

    if (low > 0) {
      return low - 1;
    }

    return 0;
  }

  private exponentialSearch({ index, offset }: { index: number; offset: number }) {
    let interval = 1;

    while (
      index < this.itemCount &&
      this.getSizeAndPositionForIndex(index).offset < offset
    ) {
      index += interval;
      interval *= 2;
    }

    return this.binarySearch({
      high: Math.min(index, this.itemCount - 1),
      low: Math.floor(index / 2),
      offset,
    });
  }
}
