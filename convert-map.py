# -*- coding: utf-8 -*-
from PIL import Image
import json

def convert_map_to_json():
    try:
        print('Start converting map1.png to JSON format...')
        
        # Load image
        map_image = Image.open('images/navmesh.jpg')
        print('Image loaded successfully, size: %d x %d' % (map_image.width, map_image.height))
        
        # Game canvas size
        game_canvas_width = 900
        game_canvas_height = 675
        
        # Resize map to match game canvas size
        print('Resizing map to game canvas size...')
        map_image = map_image.resize((game_canvas_width, game_canvas_height), Image.Resampling.LANCZOS)
        print('Resized image size: %d x %d' % (map_image.width, map_image.height))
        
        # Analyze pixels and create obstacle data
        cell_size = 20  # Obstacle cell size
        
        print('Cell size: %d' % cell_size)
        
        # Convert to RGB mode if needed
        if map_image.mode != 'RGB':
            map_image = map_image.convert('RGB')
        
        # Get pixel data
        pixels = map_image.load()
        
        obstacles = []
        passable_count = 0
        impassable_count = 0
        
        for y in range(0, game_canvas_height, cell_size):
            for x in range(0, game_canvas_width, cell_size):
                # Check center pixel color of the cell
                center_x = int(x + cell_size / 2)
                center_y = int(y + cell_size / 2)
                
                is_black = False
                
                if center_x < map_image.width and center_y < map_image.height:
                    r, g, b = pixels[center_x, center_y]
                    
                    # Calculate brightness, less than 80 is considered black (impassable)
                    brightness = r * 0.299 + g * 0.587 + b * 0.114
                    is_black = brightness < 80
                    
                    # Output first 10 cells info
                    if passable_count + impassable_count < 10:
                        print('Cell (%d,%d) center pixel(%d,%d) RGB:(%d,%d,%d) brightness: %.2f, black: %s' % 
                              (x, y, center_x, center_y, r, g, b, brightness, is_black))
                
                if is_black:
                    obstacles.append({
                        'x': x,
                        'y': y,
                        'width': cell_size,
                        'height': cell_size,
                        'type': 'wood',
                        'health': 100
                    })
                    impassable_count += 1
                else:
                    passable_count += 1
        
        # Create map data object
        map_data = {
            'version': '1.0',
            'mapImage': 'map1.png',
            'gameCanvas': {
                'width': game_canvas_width,
                'height': game_canvas_height
            },
            'mapImageSize': {
                'width': map_image.width,
                'height': map_image.height
            },
            'cellSize': cell_size,
            'obstacles': obstacles,
            'statistics': {
                'passableCells': passable_count,
                'impassableCells': impassable_count,
                'totalCells': passable_count + impassable_count
            }
        }
        
        # Save as JSON file
        json_path = 'map.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, indent=2, ensure_ascii=False)
        
        # Save as JavaScript file
        js_path = 'map-data.js'
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write('// 地图数据 - 从map1.png转换而来\n')
            f.write('const MAP_DATA = ')
            json.dump(map_data, f, indent=4, ensure_ascii=False)
            f.write(';\n')
        
        print('\nConversion completed!')
        print('Generated obstacles count: %d' % len(obstacles))
        print('Passable areas: %d cells' % passable_count)
        print('Impassable areas: %d cells' % impassable_count)
        print('Map data saved to: %s' % json_path)
        print('Map data saved to: %s' % js_path)
        
    except Exception as e:
        print('Conversion failed: %s' % str(e))
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == '__main__':
    convert_map_to_json()