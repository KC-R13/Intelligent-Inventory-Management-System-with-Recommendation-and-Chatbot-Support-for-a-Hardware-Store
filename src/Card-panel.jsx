import { useState } from 'react'
import './Card-panel.css'

function Cardpanel() {

    return(
    <div className='Card-container'>
        <div className='card'>
        <h1>low-stock item - 1</h1>

        </div>

        <div className='card'>
        <h1> low stock item - 2</h1>
        </div>

        <div className='card'>
        <h1>low stock item - 3</h1>
        </div>

        <div className='card'>
        <h1>low stock item - 4</h1>
        </div>

        <div className='card'>
        <h1>low stock item - 5</h1>
        </div>

    </div>
    )
}

export default Cardpanel;