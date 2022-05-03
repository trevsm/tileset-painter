import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { config } from "../config";
import { useCanvasContext } from "../hooks/useCanvasContext";
import { useSprite } from "../hooks/useSprite";
import { Tile, useTileGrid } from "../hooks/useTileGrid";
import { Tool, useTools } from "../hooks/useTools";
import { convertToRealPosition, getMouseTilePosition } from "../tools";

const Board = styled.canvas<{ tool: Tool }>`
  display: block;
  cursor: ${({ tool }) => (tool === Tool.draw ? "copy" : "crosshair")};
  margin-top: 20px;
  margin: 0 auto;
`;

const ArtboardContainer = styled.div`
  margin-top: 20px;
`;

export default function Artboard() {
  const { currentTile, tilesetSource } = useSprite();
  const { selectedTool } = useTools();
  const {
    dimensions,
    getDimensions,
    getGrid,
    initilizeGrid,
    setTile,
    loopGrid,
    resizeGrid,
  } = useTileGrid();
  const [useStore] = useState(() => useCanvasContext());
  const { context, setContext, drawTile, drawRect } = useStore();

  const boardRef = useRef<HTMLCanvasElement>(null);

  const [mousePos, setMousePos] = useState<Tile>();
  const [mouseDown, setMouseDown] = useState(false);

  const getOutlineColor = () => {
    if (selectedTool === Tool.draw) {
      return "#00000050";
    }
    if (selectedTool === Tool.erase) {
      return "#ff000080";
    }
  };

  interface WriteToBoardProps {
    altContext?: CanvasRenderingContext2D;
    altImage?: HTMLImageElement;
  }
  const writeToBoard = (props?: WriteToBoardProps) => {
    const { altContext, altImage } = props || {};

    if (!altContext && !tilesetSource) return;
    if (!boardRef.current) return;

    const image = altImage ? altImage : tilesetSource;
    if (!image) return;

    loopGrid(boardRef.current, (position, index) =>
      drawTile({
        image,
        index,
        position,
        altContext,
        config,
      })
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setMouseDown(true);
    if (!context || !boardRef.current || !tilesetSource) return;

    const { width, height } = boardRef.current;
    const gridSize = getDimensions();

    const mousePos = getMouseTilePosition({
      event: e,
      size: { width, height },
      gridSize,
    });

    if (selectedTool === Tool.draw)
      setTile({ tile: currentTile, position: mousePos });
    if (selectedTool === Tool.erase)
      setTile({ tile: null, position: mousePos });

    writeToBoard();
    if (!mousePos) return;

    const { X, Y } = convertToRealPosition({
      position: mousePos,
      size: boardRef.current,
      gridSize,
    });

    const padding = 1;

    writeToBoard();
    drawRect({
      size: {
        width: width / gridSize.widthCount - padding,
        height: height / gridSize.heightCount - padding,
      },
      position: { x: X + padding / 2, y: Y + padding / 2 },
      outline: { ...config.tileset.outline, color: getOutlineColor() },
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context || !boardRef.current || !tilesetSource) return;

    const { width, height } = boardRef.current;
    const gridSize = getDimensions();

    const { x, y } = getMouseTilePosition({
      event: e,
      size: { width, height },
      gridSize,
    });

    if (x !== mousePos?.x || y !== mousePos?.y) {
      setMousePos({ x, y });
      if (mouseDown) {
        if (selectedTool === Tool.draw)
          setTile({ tile: currentTile, position: { x, y } });
        if (selectedTool === Tool.erase)
          setTile({ tile: null, position: { x, y } });
      }
    }
    if (!mousePos) return;

    const { X, Y } = convertToRealPosition({
      position: mousePos,
      size: boardRef.current,
      gridSize,
    });

    const padding = 1;

    writeToBoard();
    drawRect({
      size: {
        width: width / gridSize.widthCount - padding,
        height: height / gridSize.heightCount - padding,
      },
      position: { x: X + padding / 2, y: Y + padding / 2 },
      outline: { ...config.tileset.outline, color: getOutlineColor() },
    });
  };

  const clearArtboard = () => {
    if (confirm("Are you sure you want to erase artboard?") == true) {
      initilizeGrid();
      writeToBoard();
    }
  };

  useEffect(() => {
    if (!boardRef.current) return;

    const grid = getGrid();

    boardRef.current.width =
      getDimensions().widthCount * config.scale[0] * config.quality;
    boardRef.current.height =
      getDimensions().heightCount * config.scale[1] * config.quality;

    const boardContext = boardRef.current.getContext("2d");
    if (!boardContext) return;
    boardContext.imageSmoothingEnabled = false;
    setContext(boardContext);

    if (tilesetSource) {
      if (grid.length) {
        writeToBoard({ altContext: boardContext });
      } else initilizeGrid();
    }
  }, [tilesetSource]);

  const firstMount = useRef(false);
  useEffect(() => {
    if (!boardRef.current) return;

    const nextWidth =
      getDimensions().widthCount * config.scale[0] * config.quality;
    const nextHeight =
      getDimensions().heightCount * config.scale[1] * config.quality;

    if (
      firstMount.current &&
      (nextWidth !== boardRef.current.width ||
        nextHeight !== boardRef.current.height)
    ) {
      boardRef.current.width = nextWidth;
      boardRef.current.height = nextHeight;

      resizeGrid();
      writeToBoard();
    } else {
      firstMount.current = true;
    }
  }, [dimensions]);

  return (
    <ArtboardContainer>
      <button onClick={clearArtboard}>Clear Artboard</button>{" "}
      <Board
        ref={boardRef}
        tool={selectedTool}
        onMouseDown={handleMouseDown}
        onMouseUp={() => setMouseDown(false)}
        onMouseLeave={() => {
          setMouseDown(false);
          writeToBoard();
        }}
        onMouseMove={handleMouseMove}
      ></Board>
    </ArtboardContainer>
  );
}
