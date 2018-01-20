import React, { Component, PropTypes } from 'react';
import { Provider } from 'react-redux';
import App from './App';

export default class Root extends Component {

  static propTypes = {
    store: PropTypes.object.isRequired
  };

  render() {
    return (
      <div>
        <iframe src="http://www.bbc.com/news"
                width="800"
                height="1250"
                scrolling="no"></iframe>
        <iframe src="http://www.bbc.com/news"
                width="800"
                height="1250"
                scrolling="no"></iframe>
      </div>

    )
  }

//   render() {
//     const { store } = this.props;
//     return (
//       <Provider store={store}>
//         <App />
//       </Provider>
//     );
//   }
}
