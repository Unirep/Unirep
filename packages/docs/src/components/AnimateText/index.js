import React from 'react'
import styles from './styles.module.css'

import { useEffect, useState } from 'react'

const FADE_INTERVAL_MS = 1750
const WORD_CHANGE_INTERVAL_MS = FADE_INTERVAL_MS * 2
const WORDS_TO_ANIMATE = [
    'Reddit clone',
    'p2p marketplace',
    'anon voting',
    'Upwork clone',
    'p2p lending',
    'anon journalism',
    'verified product review',
    'ebay clone',
    'anon streaming',
]

export const AnimatedText = () => {
    const [fadeProp, setFadeProp] = useState({ fade: 'fade-in' })
    const [wordOrder, setWordOrder] = useState(0)

    useEffect(() => {
        const fadeTimeout = setInterval(() => {
            fadeProp.fade === 'fade-in'
                ? setFadeProp({ fade: 'fade-out' })
                : setFadeProp({ fade: 'fade-in' })
        }, FADE_INTERVAL_MS)

        return () => clearInterval(fadeTimeout)
    }, [fadeProp])

    useEffect(() => {
        const wordTimeout = setInterval(() => {
            setWordOrder(
                (prevWordOrder) => (prevWordOrder + 1) % WORDS_TO_ANIMATE.length
            )
        }, WORD_CHANGE_INTERVAL_MS)

        return () => clearInterval(wordTimeout)
    }, [])

    return (
        <h2 className="rotating-text-wrapper">{WORDS_TO_ANIMATE[wordOrder]}</h2>
    )
}

// const texts: string[] = [
// 	"visualization",
// 	"exploring data",
// 	"live code",
// 	"the web",
// 	"interactive essays",
// 	"clear computation",
// 	"learning algorithms",
// 	"coding together"
// ]; // from observable hq web site

// const Texts = (props: { texts: string[]; wait?: number; waitbt?: number; speed?: number; op?: number; }) => {
// 	const [state, setState] = React.useState({
// 		left: '', right: '', texts: props.texts, current: props.texts[0]
// 	});
// 	const stay = React.useRef(false);
// 	const staybt = React.useRef(false);
// 	const update = React.useCallback(() => {
// 		const addNextChar = () => {
// 			setState({ ...state,
// 					  left: state.left + state.texts[0].slice(0, 1),
// 					  right: state.texts[0].slice(1),
// 					  texts: state.texts.map((e, i) => i === 0 ? e.slice(1) : e)
// 					 });
// 		};
// 		const deleteLastChar = () => {
// 			if (state.left.slice(0, -1) === '') { stay.current = true; staybt.current = true;}
// 			setState({ ...state,
// 					  left: state.left.slice(0, -1),
// 					  right: state.left.slice(-1) + state.right
// 					 });
// 		}
// 		const switchToNextText = () => {
// 			stay.current = false;
// 			staybt.current = false;
// 			const nextText = state.texts[1];
// 			setState({ ...state,
// 					  left: nextText.slice(0, 1), // first char of next text
// 					  right: nextText.slice(1), // rest of the next char
// 					  texts: [
// 						  ...state.texts.slice(1).map((e, i) => i === 0 ? e.slice(1) : e),
// 						  state.current
// 					  ],
// 					  current: nextText
// 					 });
// 		}
// 		if (state.texts[0].length === 0) {
// 			stay.current = false;
// 			if (state.left === '') switchToNextText();
// 			else deleteLastChar();
// 		} else addNextChar();
// 	}, [stay, staybt, setState, state]);
// 	React.useEffect(() => {
// 		setTimeout(() => {
// 			if (state.texts[0].length === 1) stay.current = true;
// 			window.requestAnimationFrame(update);
// 		}, stay.current ?
// 				   staybt.current ? props.waitbt || 30 : props.wait || 3000
// 				   : props.speed || 30);
// 	}, [update]);
// 	return <span className={props.className}>{state.left}<span>{state.right}</span></span>
// };

// const App = () => (<div> Dynamic Text -> <Texts className={'texts'} waitbt={50} wait={2000} speed={27} texts={texts}/></div>)
// ReactDOM.render(<App />, document.getElementById('root'));
