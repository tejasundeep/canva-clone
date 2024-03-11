// pages/index.js

import Head from 'next/head';
import React, { useState, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';
import pica from 'pica';
import { Button, Container, Form, FormControl, InputGroup, Select } from 'react-bootstrap';
import styles from '@/styles/Home.module.css'

const RESOLUTIONS = {
    '4K': { width: 3840, height: 2160 },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
};

export default function Home() {
    const [elements, setElements] = useState({ texts: [], images: [] });
    const [inputText, setInputText] = useState('');
    const [selectedResolution, setSelectedResolution] = useState('1080p');
    const [selectedElement, setSelectedElement] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [zIndices, setZIndices] = useState({ texts: {}, images: {} });

    const textRefs = useRef([]);
    const imageRefs = useRef([]);

    const addText = useCallback(() => {
        if (inputText.trim()) {
            setElements(prev => ({ ...prev, texts: [...prev.texts, inputText.trim()] }));
            setInputText('');
        }
    }, [inputText]);

    const addImage = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setElements(prev => ({ ...prev, images: [...prev.images, { src: e.target.result, width: 'auto', height: 'auto' }] }));
            reader.readAsDataURL(file);
        }
    }, []);

    const handleResizeStart = useCallback((e, index) => {
        e.stopPropagation();
        const img = e.target.previousSibling;
        const initialWidth = img.offsetWidth;
        const aspectRatio = img.offsetHeight / img.offsetWidth;

        const handleResize = (e) => {
            const width = e.clientX - img.getBoundingClientRect().left;
            const height = width * aspectRatio;
            setElements(prev => {
                const newElements = { ...prev };
                newElements.images[index].width = width;
                newElements.images[index].height = height;
                return newElements;
            });
        };

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleResize);
        }, { once: true });
    }, []);

    const updateZIndex = useCallback((index, type, increment) => {
        setZIndices(prev => {
            const updated = { ...prev };
            updated[type][index] = (updated[type][index] || 0) + (increment ? 1 : -1);
            return updated;
        });
    }, []);

    const increaseZIndex = useCallback((index, type) => {
        updateZIndex(index, type, true);
    }, [updateZIndex]);

    const decreaseZIndex = useCallback((index, type) => {
        updateZIndex(index, type, false);
    }, [updateZIndex]);

    const exportToImage = useCallback(() => {
        const node = document.getElementById('canvas');
        const { width, height } = RESOLUTIONS[selectedResolution];

        html2canvas(node).then(capturedCanvas => {
            const contentWidth = capturedCanvas.width;
            const contentHeight = capturedCanvas.height;
            const scale = Math.max(width / contentWidth, height / contentHeight);
            const scaledWidth = contentWidth * scale;
            const scaledHeight = contentHeight * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;

            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = scaledWidth;
            scaledCanvas.height = scaledHeight;

            pica({ features: ['all'], quality: 3 })
                .resize(capturedCanvas, scaledCanvas, { unsharpAmount: 80, unsharpRadius: 0.6, unsharpThreshold: 1 })
                .then(() => {
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = width;
                    finalCanvas.height = height;
                    finalCanvas.getContext('2d').fillRect(0, 0, width, height);
                    return pica().resize(scaledCanvas, finalCanvas);
                })
                .then((resultCanvas) => {
                    const link = document.createElement('a');
                    link.download = 'my-image.png';
                    link.href = resultCanvas.toDataURL('image/png');
                    link.click();
                });
        });
    }, [selectedResolution]);

    return (
        <Container className="vh-100">
            <Head>
                <title>Canva Clone</title>
                <meta name="description" content="A basic version of a Canva-like tool created with Next.js" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Controls
                inputText={inputText}
                setInputText={setInputText}
                addText={addText}
                addImage={addImage}
                selectedResolution={selectedResolution}
                setSelectedResolution={setSelectedResolution}
                exportToImage={exportToImage}
                increaseZIndex={increaseZIndex}
                decreaseZIndex={decreaseZIndex}
                selectedElement={selectedElement}
                selectedType={selectedType}
            />
            <Canvas
                elements={elements}
                textRefs={textRefs}
                imageRefs={imageRefs}
                handleResizeStart={handleResizeStart}
                increaseZIndex={increaseZIndex}
                decreaseZIndex={decreaseZIndex}
                setSelectedElement={setSelectedElement}
                setSelectedType={setSelectedType}
                zIndices={zIndices}
            />
        </Container>
    );
}

function Controls({ inputText, setInputText, addText, addImage, selectedResolution, setSelectedResolution, exportToImage, increaseZIndex, decreaseZIndex, selectedElement, selectedType }) {
    return (
        <div className={`d-flex justify-content-start align-items-center py-3 ${styles.controls}`}>
            <div className='d-flex me-2'>
                <Button variant="secondary" className="me-2" onClick={() => increaseZIndex(selectedElement, selectedType)} disabled={selectedElement === null}>Up</Button>
                <Button variant="secondary" onClick={() => decreaseZIndex(selectedElement, selectedType)} disabled={selectedElement === null}>Down</Button>
            </div>
            <InputGroup className="me-2">
                <FormControl
                    placeholder="Enter text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <Button variant="primary" onClick={addText}>Add</Button>
            </InputGroup>
            <Form.Control type="file" accept="image/*" className="me-2" onChange={addImage} />
            <Form.Select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="me-2"
            >
                {Object.keys(RESOLUTIONS).map((res) => (
                    <option key={res} value={res}>{res}</option>
                ))}
            </Form.Select>
            <Button variant="success" onClick={exportToImage}>Export</Button>
        </div>
    );
}

function Canvas({ elements, textRefs, imageRefs, handleResizeStart, increaseZIndex, decreaseZIndex, setSelectedElement, setSelectedType, zIndices }) {
    return (
        <div id="canvas" className={`border border-dark bg-light ${styles.canvas}`} style={{ height: '80vh', position: 'relative', overflow: 'hidden' }}>
            {elements.texts.map((text, index) => (
                <Draggable key={index} nodeRef={textRefs.current[index] || (textRefs.current[index] = React.createRef())}>
                    <div
                        ref={textRefs.current[index]}
                        className={`p-2 rounded position-absolute text-element ${styles.textElement}`}
                        style={{ cursor: 'move', zIndex: zIndices.texts[index] || 0 }}
                        onClick={() => { setSelectedElement(index); setSelectedType('texts'); }}
                    >
                        {text}
                    </div>
                </Draggable>
            ))}
            {elements.images.map((imgData, index) => (
                <Draggable key={index} nodeRef={imageRefs.current[index] || (imageRefs.current[index] = React.createRef())}>
                    <div
                        ref={imageRefs.current[index]}
                        className={`position-absolute ${styles.imageElement}`}
                        style={{ cursor: 'move', zIndex: zIndices.images[index] || 0 }}
                        onClick={() => { setSelectedElement(index); setSelectedType('images'); }}
                    >
                        <img src={imgData.src} style={{ width: imgData.width, height: imgData.height }} alt="User uploaded content" />
                        <div
                            style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: 'blue',
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                cursor: 'se-resize',
                            }}
                            onMouseDown={(e) => handleResizeStart(e, index)}
                        ></div>
                    </div>
                </Draggable>
            ))}
        </div>
    );
}
