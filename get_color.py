import cv2
import numpy as np

video_path = "assets/intro-video.mp4"
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error: Could not open video")
    sys.exit(1)

# Read frames to find one where the logo and tagline are fully drawn
# Let's read frame 100 or 150
frame_idx = 0
found_frame = None
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    frame_idx += 1
    if frame_idx == 100:  # 100th frame should have it fully visible
        found_frame = frame
        break

cap.release()

if found_frame is not None:
    height, width, _ = found_frame.shape
    print(f"Video size: {width}x{height}")
    
    # Convert to grayscale to find white pixels (the logo and tagline are white/gold)
    gray = cv2.cvtColor(found_frame, cv2.COLOR_BGR2GRAY)
    
    # We want to find the tagline, which is at the bottom part of the video.
    # Let's look at the bottom 40% of the frame (where the tagline resides)
    tagline_area = gray[int(height*0.6):, :]
    
    # Find pixels that are bright (white/gold tagline text).
    # Since the background is green, the text is much brighter than the background.
    # Let's apply a threshold. The green background has a gray value around 100-110, white text is > 200.
    _, thresh = cv2.threshold(tagline_area, 180, 255, cv2.THRESH_BINARY)
    
    # Find non-zero coordinates
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) > 0:
        # coords are in (y, x) format relative to tagline_area
        min_y, min_x = coords.min(axis=0)
        max_y, max_x = coords.max(axis=0)
        
        # Adjust y coordinates back to the full frame
        min_y += int(height*0.6)
        max_y += int(height*0.6)
        
        tagline_width = max_x - min_x
        tagline_width_percent = (tagline_width / width) * 100
        
        print(f"Tagline horizontal bounding box: X from {min_x} to {max_x}")
        print(f"Tagline width: {tagline_width} pixels ({tagline_width_percent:.2f}% of video width)")
        print(f"Tagline vertical bounding box: Y from {min_y} to {max_y}")
        
        # Let's also find the logo bounding box
        logo_area = gray[:int(height*0.6), :]
        _, thresh_logo = cv2.threshold(logo_area, 180, 255, cv2.THRESH_BINARY)
        coords_logo = np.column_stack(np.where(thresh_logo > 0))
        if len(coords_logo) > 0:
            min_y_l, min_x_l = coords_logo.min(axis=0)
            max_y_l, max_x_l = coords_logo.max(axis=0)
            print(f"Logo horizontal bounding box: X from {min_x_l} to {max_x_l}")
            print(f"Logo width: {max_x_l - min_x_l} pixels ({((max_x_l - min_x_l)/width)*100:.2f}% of video width)")
    else:
        print("No tagline pixels found with thresh > 180")
else:
    print("Could not find frame 100")
