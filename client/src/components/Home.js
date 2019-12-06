import React from 'react';
import './Home.css';

class Home extends React.Component {
    constructor() {
        super();
        this.state = {
            looks: []
        }
    }

    componentDidMount() {
        console.log('componentDidMount')
        this.getLooks();
    }

    async getLooks() {
        console.log('getLooks')
        let looksResponse = await fetch('/home', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })

        console.log('looksResponse')
        console.log(looksResponse)
        let looksResponseData = await looksResponse.json();
        console.log('looksResponseData')
        console.log(looksResponseData)
        this.setState({
            looks: looksResponseData
        }, () => {
            // console.log('this.state.looks')
            // console.log(this.state.looks)
        });
    }

    render() {

        return (
            <div className="home container p-5">
                <h1>the start of a cool app</h1>
                <h3>looks</h3>
                <ul>
                    {this.state.looks.length ? this.state.looks.map((key, index) => {
                        return <li key={index}><iframe id="inlineFrameExample"
                            title="Inline Frame Example"
                            width="500"
                            height="500"
                            src={this.state.looks[index].embed_url}>
                        </iframe></li>
                    }) : <li>no looks!</li>}
                </ul>
            </div>
        )
    }
}

export default Home;