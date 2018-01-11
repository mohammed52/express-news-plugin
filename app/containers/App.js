import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Header from '../components/Header';
import MainSection from '../components/MainSection';
import * as TodoActions from '../actions/todos';
import style from './App.css';

var scrape = require('website-scraper');
var options = {
  urls: ['http://nodejs.org/'],
  directory: '/path/to/save/',
};

@connect(
  state => ({
    todos: state.todos
  }),
  dispatch => ({
    actions: bindActionCreators(TodoActions, dispatch)
  })
)
export default class App extends Component {

  static propTypes = {
    todos: PropTypes.array.isRequired,
    actions: PropTypes.object.isRequired
  };

  componentWillMount() {
    console.log("componentWillMount");
  }

  render() {
    const {todos, actions} = this.props;

    return (
      <div className={style.normal}>
        <Header addTodo={actions.addTodo} />
        <MainSection todos={todos}
                     actions={actions} />
        <br/>
        <br/>
        <br/>
        <div>
          Hello World REALLY COOL DOES THIS
        </div>
        <iframe src={"http://www.bbc.com/news"}
                frameBorder="0" />
      </div>
    );
  }
}
