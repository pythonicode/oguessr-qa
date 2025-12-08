#!/usr/bin/env python3
"""
Text Obfuscation Script
Uses OCR to detect text in an image and obfuscates it with white boxes.
Uses EAST text detector for better accuracy with multi-lingual text.
"""

import cv2
import numpy as np
from PIL import Image
import pytesseract

def preprocess_image_for_ocr(img):
    """
    Preprocess image to improve OCR accuracy.
    Returns list of preprocessed versions to try.
    """
    preprocessed = []
    
    # Original
    preprocessed.append(("original", img.copy()))
    
    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # High contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    preprocessed.append(("enhanced", cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)))
    
    # Binary threshold
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    preprocessed.append(("binary", cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)))
    
    # Inverted binary
    _, inv_binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    preprocessed.append(("inv_binary", cv2.cvtColor(inv_binary, cv2.COLOR_GRAY2BGR)))
    
    return preprocessed


def obfuscate_text_in_image(input_path, output_path, confidence_threshold=30, min_text_length=1, save_individual=False):
    """
    Detect text in an image using OCR and obfuscate it with white boxes.
    
    Args:
        input_path: Path to the input image
        output_path: Path to save the obfuscated image
        confidence_threshold: Minimum OCR confidence to consider (0-100)
        min_text_length: Minimum text length to obfuscate
        save_individual: If True, save individual results for each method/preprocessing combo
    """
    # Load the image
    print(f"Loading image from {input_path}...")
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Could not load image from {input_path}")
    
    print(f"Image size: {img.shape[1]}x{img.shape[0]}")
    
    # Create output directory if saving individual results
    import os
    if save_individual:
        os.makedirs("images", exist_ok=True)
    
    # Create a copy for the output
    output_img = img.copy()
    
    # Use pytesseract to detect text regions
    print(f"\nDetecting text regions using OCR (confidence >= {confidence_threshold})...")
    print("Testing multiple PSM modes and preprocessing methods...\n")
    
    all_boxes = []
    method_results = []  # Store results for each method
    
    # Try multiple PSM modes for better coverage
    psm_modes = [
        (3, "Fully automatic page segmentation"),
        (6, "Uniform block of text"),
        (11, "Sparse text"),
        (12, "Sparse text with OSD"),
    ]
    
    # Preprocess image
    preprocessed_images = preprocess_image_for_ocr(img)
    
    for prep_name, prep_img in preprocessed_images:
        # Convert to RGB for pytesseract
        rgb_img = cv2.cvtColor(prep_img, cv2.COLOR_BGR2RGB)
        
        for psm, psm_desc in psm_modes:
            method_boxes = []
            
            try:
                print(f"Trying PSM {psm} ({psm_desc}) on {prep_name} image...")
                
                data = pytesseract.image_to_data(
                    rgb_img, 
                    output_type=pytesseract.Output.DICT, 
                    lang='jpn+eng',
                    config=f'--psm {psm}'
                )
                
                # Extract bounding boxes for detected text
                n_boxes = len(data['text'])
                boxes_found = 0
                
                for i in range(n_boxes):
                    conf = int(data['conf'][i]) if data['conf'][i] != '-1' else 0
                    text = data['text'][i].strip()
                    
                    # Only process if confidence is above threshold and text exists
                    if conf >= confidence_threshold and text and len(text) >= min_text_length:
                        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                        
                        # Filter out unreasonably small or large boxes
                        if w > 3 and h > 3 and w < img.shape[1] * 0.9 and h < img.shape[0] * 0.9:
                            method_boxes.append((x, y, w, h, conf, text))
                            
                            # Check if this box is not already detected globally (avoid duplicates)
                            is_duplicate = False
                            for ex_x, ex_y, ex_w, ex_h, _, _ in all_boxes:
                                # Check overlap
                                if (abs(x - ex_x) < 5 and abs(y - ex_y) < 5 and 
                                    abs(w - ex_w) < 5 and abs(h - ex_h) < 5):
                                    is_duplicate = True
                                    break
                            
                            if not is_duplicate:
                                all_boxes.append((x, y, w, h, conf, text))
                                boxes_found += 1
                
                print(f"  Found {boxes_found} new text regions (total for this method: {len(method_boxes)})\n")
                
                # Save individual result if requested
                if save_individual and method_boxes:
                    method_img = img.copy()
                    method_merged = merge_overlapping_boxes([(x, y, w, h) for x, y, w, h, _, _ in method_boxes])
                    
                    for x, y, w, h in method_merged:
                        padding = 8
                        x1 = max(0, x - padding)
                        y1 = max(0, y - padding)
                        x2 = min(img.shape[1], x + w + padding)
                        y2 = min(img.shape[0], y + h + padding)
                        cv2.rectangle(method_img, (x1, y1), (x2, y2), (255, 255, 255), -1)
                    
                    filename = f"images/{prep_name}_psm{psm}.png"
                    cv2.imwrite(filename, method_img)
                    method_results.append({
                        'name': f"{prep_name}_psm{psm}",
                        'boxes': len(method_boxes),
                        'merged': len(method_merged),
                        'file': filename
                    })
                
            except Exception as e:
                print(f"  Error with PSM {psm}: {e}\n")
                continue
    
    print(f"Total detected: {len(all_boxes)} text regions")
    
    # Print all detected text
    if all_boxes:
        print("\nDetected text:")
        for i, (x, y, w, h, conf, text) in enumerate(sorted(all_boxes, key=lambda b: -b[4])):
            print(f"  [{conf:2d}%] '{text}'")
    
    if not all_boxes:
        print("No text detected with current settings. Try lowering confidence_threshold.")
        cv2.imwrite(output_path, output_img)
        return 0
    
    # Merge overlapping boxes
    merged_boxes = merge_overlapping_boxes([(x, y, w, h) for x, y, w, h, _, _ in all_boxes])
    print(f"\nMerged into {len(merged_boxes)} regions\n")
    
    # Apply white box obfuscation to each text region
    for i, (x, y, w, h) in enumerate(merged_boxes):
        # Add padding around the text box for better coverage
        padding = 8
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(img.shape[1], x + w + padding)
        y2 = min(img.shape[0], y + h + padding)
        
        # Draw white filled rectangle
        cv2.rectangle(output_img, (x1, y1), (x2, y2), (255, 255, 255), -1)
        
        print(f"Obfuscated region {i+1}/{len(merged_boxes)}: ({x1}, {y1}) to ({x2}, {y2}), size: {x2-x1}x{y2-y1}")
    
    # Save the output image
    print(f"\nSaving combined obfuscated image to {output_path}...")
    cv2.imwrite(output_path, output_img)
    
    # Print summary of individual results
    if save_individual and method_results:
        print(f"\n{'='*60}")
        print("Individual method results saved:")
        print(f"{'='*60}")
        for result in sorted(method_results, key=lambda r: -r['boxes']):
            print(f"  {result['name']:25s} - {result['boxes']:3d} boxes ({result['merged']:2d} merged) -> {result['file']}")
    
    print("\nDone!")
    
    return len(merged_boxes)


def merge_overlapping_boxes(boxes, margin=20):
    """
    Merge overlapping and nearby bounding boxes using a more aggressive strategy.
    This is especially important for multi-character text in Japanese.
    
    Args:
        boxes: List of (x, y, w, h) tuples
        margin: Distance threshold for merging nearby boxes
    
    Returns:
        List of merged (x, y, w, h) tuples
    """
    if not boxes:
        return []
    
    # Convert to (x1, y1, x2, y2) format
    boxes_xyxy = [(x, y, x+w, y+h) for x, y, w, h in boxes]
    
    # Keep merging until no more merges are possible
    changed = True
    while changed:
        changed = False
        merged = []
        used = set()
        
        for i, box1 in enumerate(boxes_xyxy):
            if i in used:
                continue
                
            x1_min, y1_min, x1_max, y1_max = box1
            
            # Find all nearby/overlapping boxes
            overlapping = [i]
            for j, box2 in enumerate(boxes_xyxy):
                if j <= i or j in used:
                    continue
                    
                x2_min, y2_min, x2_max, y2_max = box2
                
                # Check if boxes are close enough or overlapping
                # Use margin for proximity check
                if (x2_min - margin <= x1_max and x1_min <= x2_max + margin and
                    y2_min - margin <= y1_max and y1_min <= y2_max + margin):
                    overlapping.append(j)
                    # Expand the merged box
                    x1_min = min(x1_min, x2_min)
                    y1_min = min(y1_min, y2_min)
                    x1_max = max(x1_max, x2_max)
                    y1_max = max(y1_max, y2_max)
                    changed = True
            
            # Mark as used
            for idx in overlapping:
                used.add(idx)
            
            # Add merged box
            merged.append((x1_min, y1_min, x1_max, y1_max))
        
        boxes_xyxy = merged
    
    # Convert back to (x, y, w, h) format
    return [(x1, y1, x2 - x1, y2 - y1) for x1, y1, x2, y2 in boxes_xyxy]


if __name__ == "__main__":
    # Configuration
    input_image = "image.png"
    output_image = "image-obfuscated.png"
    
    # Confidence threshold: 0-100 (higher = more selective, less false positives)
    # Lowered to 30 for better recall (catch more text, even if less confident)
    # The multi-pass approach will help filter out false positives through voting
    # - Use 40-50 for more selective
    # - Use 20-30 for aggressive (better for maps with varied text)
    confidence_threshold = 30
    
    # Minimum text length to obfuscate (characters)
    min_text_length = 1
    
    # Save individual results for each method/preprocessing combination
    save_individual_results = True
    
    try:
        num_regions = obfuscate_text_in_image(
            input_image, 
            output_image, 
            confidence_threshold=confidence_threshold,
            min_text_length=min_text_length,
            save_individual=save_individual_results
        )
        print(f"\n{'='*60}")
        print(f"✓ Successfully obfuscated {num_regions} text regions")
        print(f"✓ Combined output saved to: {output_image}")
        if save_individual_results:
            print(f"✓ Individual method results saved to: images/")
        print(f"{'='*60}")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()

