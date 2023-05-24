import ReactDOM from 'react-dom'

import VirtualList, {ItemStyle} from '../src';
import './index.css';

const EXAMPLE = () => {
  const renderItem = ({style, index}: {style: ItemStyle; index: number}) => {
    return (
      <div className="Row" style={style} key={index}>
        Row #{index}
      </div>
    );
  };
  
  return (
    <div className="Root">
      <VirtualList
        width="auto"
        height={400}
        itemCount={1000}
        renderItem={renderItem}
        itemSize={50}
        className="VirtualList"
      />
    </div>
  );
}

ReactDOM.render(<EXAMPLE />, document.querySelector('#root'));

