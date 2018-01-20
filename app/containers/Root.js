import React, { Component, PropTypes } from 'react';
import { Provider } from 'react-redux';
import App from './App';

export default class Root extends Component {

  static propTypes = {
    store: PropTypes.object.isRequired
  };

  render() {
    const height = "5000";
    return (
      <div>
        <iframe src="http://www.bbc.com/news"
                width="780"
                height={height}
                scrolling="no"></iframe>
        <iframe src="http://edition.cnn.com/"
                width="780"
                height={height}
                scrolling="no"></iframe>
        <iframe src="https://tribune.com.pk/"
                width="780"
                height={height}
                scrolling="no"></iframe>
        <iframe src="http://www.dawn.com/"
                width="780"
                height={height}
                scrolling="no"></iframe>
        <iframe src="https://timesofindia.indiatimes.com/"
                width="780"
                height={height}
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
