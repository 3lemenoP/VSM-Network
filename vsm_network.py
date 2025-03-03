#!/usr/bin/env python3
"""
vsm_network_dynamic_scaling_autoview.py

A VSM network visualization demonstrating dynamic visual scaling, color coding,
and automatic view adjustment for any sized network. All node data is stored in memory.
"""

import numpy as np
import matplotlib.pyplot as plt
import tkinter as tk
from tkinter import simpledialog, messagebox
import csv

# -----------------------------------------------------------------------------
# GLOBAL IN–MEMORY DATABASE
# -----------------------------------------------------------------------------
nodes_db = {}

# -----------------------------------------------------------------------------
# UTILITY FUNCTIONS: GEOMETRY, SCALING, AND COLORING
# -----------------------------------------------------------------------------

def forward(coord, direction, distance):
    direction = direction / np.linalg.norm(direction)
    return np.array(coord) + distance * direction

def turn(direction, angle_degrees):
    angle_radians = np.deg2rad(angle_degrees)
    rot_mat = np.array([[np.cos(angle_radians), np.sin(angle_radians)],
                        [-np.sin(angle_radians), np.cos(angle_radians)]])
    return np.dot(direction, rot_mat)

def generate_polygon(center, edge_length, poly_order):
    angles = np.linspace(0, 2*np.pi, poly_order+1)  # Close the polygon
    vertices = np.array([[center[0] + edge_length * np.cos(a),
                          center[1] + edge_length * np.sin(a)] for a in angles])
    return vertices

def fractalise_object(parent_node, poly_order, edge_length):
    polygon = generate_polygon(parent_node['pos'], edge_length, poly_order)
    child_positions = polygon[:-1]  # Exclude duplicate closing vertex
    return child_positions, polygon

def get_edge_length(layer):
    """Decrease edge length with depth so that child nodes cluster closer to their parent."""
    base_length = 1.0
    return base_length / (layer + 2)

def get_marker_size(layer):
    """Decrease marker size for deeper layers."""
    base_size = 500
    size = base_size / (layer + 1)
    return max(size, 50)

def get_node_color(layer):
    """
    Returns a color from a continuous colormap based on the recursion layer.
    Here we use the 'viridis' colormap.
    """
    cmap = plt.get_cmap('viridis')
    # Assume maximum expected depth is 10 for scaling purposes
    fraction = min(layer / 10, 1.0)
    return cmap(fraction)

# -----------------------------------------------------------------------------
# VSMNetwork CLASS: VISUALIZATION AND INTERACTION
# -----------------------------------------------------------------------------

class VSMNetwork:
    def __init__(self):
        plt.ion()  # Turn on interactive mode
        self.fig, self.ax = plt.subplots(figsize=(10, 8))
        self.fig.canvas.manager.set_window_title("VSM Global – Dynamic Scaling & Auto-View")
        self.ax.set_facecolor('black')
        self.ax.set_title("VSM Global", color='white')
        # Initial limits will be adjusted later based on nodes
        self.ax.set_xlim(-2, 2)
        self.ax.set_ylim(-2, 2)
        self.ax.set_aspect('equal')
        
        self.tk_root = tk.Tk()
        self.tk_root.withdraw()
        self.tk_root.wm_attributes('-topmost', 1)
        
        self.nodes = {}  # Local mapping: tag -> node dictionary
        self.seed_tag = "0/0/1"
        self.create_seed_node()
        self.setup_event_handling()
        
    def setup_event_handling(self):
        self.fig.canvas.mpl_connect('button_press_event', self.on_click)
        self.fig.canvas.mpl_connect('pick_event', self.on_pick)
        self.fig.canvas.mpl_connect('key_press_event', self.on_key)
        
    def create_seed_node(self):
        x, y = 0, 0
        tag = self.seed_tag
        node = {
            'tag': tag,
            'pos': (x, y),
            'layer': 0,
            'shape': 0,
            'node': 1,
            'polyOrder': 6,  # Default: hexagon
            'parent': None,
            'orgUnit': 'n/a',
            'name': tag
        }
        self.nodes[tag] = node
        nodes_db[tag] = node
        size = get_marker_size(0)
        color = get_node_color(0)
        scatter = self.ax.scatter(x, y, s=size, c=[color], picker=True)
        node['artist'] = scatter
        self.ax.text(x+0.01, y+0.05, tag, color='white', fontsize=12, picker=True)
        self.adjust_view()
        self.fig.canvas.draw()
    
    def adjust_view(self):
        """
        Adjust the axes limits based on the positions of all nodes.
        Adds a margin so that all nodes are visible.
        """
        if not self.nodes:
            self.ax.set_xlim(-2, 2)
            self.ax.set_ylim(-2, 2)
            return
        
        xs = [node['pos'][0] for node in self.nodes.values()]
        ys = [node['pos'][1] for node in self.nodes.values()]
        margin_x = (max(xs) - min(xs)) * 0.2 if max(xs) != min(xs) else 1.0
        margin_y = (max(ys) - min(ys)) * 0.2 if max(ys) != min(ys) else 1.0
        self.ax.set_xlim(min(xs) - margin_x, max(xs) + margin_x)
        self.ax.set_ylim(min(ys) - margin_y, max(ys) + margin_y)
    
    def on_click(self, event):
        if event.button == 3:  # Right-click
            click_coords = (event.xdata, event.ydata)
            if click_coords[0] is None or click_coords[1] is None:
                return
            nearest_tag, dist = self.find_nearest_node(click_coords)
            if nearest_tag is not None and dist < 0.1:
                self.show_node_context_menu(event, nearest_tag)
            else:
                self.show_general_context_menu(event)
                
    def on_pick(self, event):
        for tag, node in self.nodes.items():
            if 'artist' in node and node['artist'] == event.artist:
                self.show_node_context_menu(event, tag)
                break
                
    def on_key(self, event):
        if event.key == 'a':
            self.add_child_nodes(self.seed_tag)
        elif event.key == 'r':
            self.refresh_screen()
        elif event.key == 'v':
            self.voice_command()
    
    def find_nearest_node(self, coords):
        min_dist = float('inf')
        nearest_tag = None
        for tag, node in self.nodes.items():
            node_pos = node['pos']
            dist = np.linalg.norm(np.array(coords) - np.array(node_pos))
            if dist < min_dist:
                min_dist = dist
                nearest_tag = tag
        return nearest_tag, min_dist
    
    def show_node_context_menu(self, event, tag):
        menu = tk.Menu(self.tk_root, tearoff=0)
        node = self.nodes.get(tag)
        if not node:
            return
        menu.add_command(label=f"Object Ref: {node['tag']}")
        menu.add_command(label=f"Object Name: {node['name']}")
        menu.add_command(label="Update Name", command=lambda: self.update_node_name(tag))
        menu.add_command(label="Heads Up Display", command=lambda: self.heads_up_display(tag))
        menu.add_command(label="Flash Node", command=lambda: self.flash_node(tag))
        submenu = tk.Menu(menu, tearoff=0)
        submenu.add_command(label="View Sub-Structure", command=lambda: self.view_sub_structure(tag))
        submenu.add_command(label="Trace Sub-Structure", command=lambda: self.trace_sub_structure(tag))
        menu.add_cascade(label="VSM Enquiry", menu=submenu)
        submenu2 = tk.Menu(menu, tearoff=0)
        submenu2.add_command(label="Add Group Node", command=lambda: self.add_group_node(tag))
        submenu2.add_command(label="Delete Group Node", command=lambda: self.delete_group_node(tag))
        menu.add_cascade(label="Modify Structure", menu=submenu2)
        try:
            menu.tk_popup(event.guiEvent.x_root, event.guiEvent.y_root)
        finally:
            menu.grab_release()
    
    def show_general_context_menu(self, event):
        menu = tk.Menu(self.tk_root, tearoff=0)
        menu.add_command(label="Create Embeddings", command=self.create_embeddings)
        menu.add_command(label="Get Organisation", command=self.get_organisation)
        menu.add_command(label="Refresh Screen", command=self.refresh_screen)
        menu.add_command(label="Voice Command", command=self.voice_command)
        menu.add_command(label="Export Network", command=self.export_network)
        try:
            menu.tk_popup(event.guiEvent.x_root, event.guiEvent.y_root)
        finally:
            menu.grab_release()
    
    def update_node_name(self, tag):
        node = self.nodes.get(tag)
        if not node:
            return
        new_name = simpledialog.askstring("Update Node Name", "Enter new node name:", parent=self.tk_root)
        if new_name:
            node['name'] = new_name
            self.refresh_screen()
    
    def heads_up_display(self, tag):
        node = self.nodes.get(tag)
        if not node:
            return
        hud = tk.Toplevel(self.tk_root)
        hud.title("Heads Up Display")
        info = (f"Tag: {node['tag']}\n"
                f"Name: {node['name']}\n"
                f"Position: {node['pos']}\n"
                f"Layer: {node['layer']}")
        label = tk.Label(hud, text=info, font=("Arial", 12))
        label.pack(padx=10, pady=10)
    
    def view_sub_structure(self, tag):
        self.add_child_nodes(tag)
    
    def trace_sub_structure(self, tag):
        if tag not in self.nodes:
            return
        self.ax.cla()
        self.ax.set_facecolor('black')
        for node in self.nodes.values():
            pos = node['pos']
            self.ax.scatter(pos[0], pos[1], s=get_marker_size(node['layer']),
                            c=[get_node_color(node['layer'])], picker=True)
            self.ax.text(pos[0]+0.01, pos[1]+0.01, node['tag'], color='white', fontsize=8)
            if node['parent'] in self.nodes:
                parent_pos = self.nodes[node['parent']]['pos']
                self.ax.plot([parent_pos[0], pos[0]], [parent_pos[1], pos[1]],
                             color='white', linewidth=2)
        self.adjust_view()
        self.fig.canvas.draw()
    
    def add_child_nodes(self, parent_tag, poly_order=None):
        parent_node = self.nodes.get(parent_tag)
        if not parent_node:
            return
        if poly_order is None:
            poly_order = parent_node.get('polyOrder', 6)
        edge_length = get_edge_length(parent_node['layer'])
        child_positions, polygon = fractalise_object(parent_node, poly_order, edge_length)
        self.ax.plot(polygon[:,0], polygon[:,1], color='cyan', linewidth=2)
        for i, pos in enumerate(child_positions):
            new_tag = f"{parent_tag}-{i+1}"
            if new_tag in self.nodes:
                continue
            new_layer = parent_node['layer'] + 1
            new_node = {
                'tag': new_tag,
                'pos': (pos[0], pos[1]),
                'layer': new_layer,
                'shape': parent_node['shape'],
                'node': i+1,
                'polyOrder': poly_order,
                'parent': parent_tag,
                'orgUnit': parent_node.get('orgUnit', ''),
                'name': new_tag
            }
            self.nodes[new_tag] = new_node
            nodes_db[new_tag] = new_node
            scatter = self.ax.scatter(pos[0], pos[1],
                                      s=get_marker_size(new_layer),
                                      c=[get_node_color(new_layer)],
                                      picker=True)
            new_node['artist'] = scatter
            self.ax.text(pos[0]+0.01, pos[1]+0.01, new_tag, color='white', fontsize=8)
        self.adjust_view()
        self.fig.canvas.draw()
    
    def add_group_node(self, tag):
        dialog = tk.Toplevel(self.tk_root)
        dialog.wm_attributes('-topmost', 1)
        dialog.title("Group Node")
        label = tk.Label(dialog, text="Enter number of polygon vertices:")
        label.pack(padx=10, pady=5)
        entry = tk.Entry(dialog)
        entry.insert(0, "6")
        entry.pack(padx=10, pady=5)
        def on_ok():
            try:
                poly_order = int(entry.get())
                dialog.destroy()
                self.add_child_nodes(tag, poly_order=poly_order)
            except ValueError:
                messagebox.showerror("Error", "Please enter a valid number", parent=dialog)
        ok_button = tk.Button(dialog, text="OK", command=on_ok)
        ok_button.pack(pady=10)
        dialog.geometry("+%d+%d" % (
            dialog.winfo_screenwidth()//2 - dialog.winfo_reqwidth()//2,
            dialog.winfo_screenheight()//2 - dialog.winfo_reqheight()//2))
    
    def delete_group_node(self, tag):
        has_children = any(node.get('parent') == tag for node in self.nodes.values())
        if has_children:
            messagebox.showinfo("Delete Node",
                                "Cannot delete node with children. Remove children first.",
                                parent=self.tk_root)
            return
        if tag in self.nodes:
            del self.nodes[tag]
        if tag in nodes_db:
            del nodes_db[tag]
        self.refresh_screen()
    
    def flash_node(self, tag):
        node = self.nodes.get(tag)
        if not node:
            return
        artist = node.get('artist')
        if artist is None:
            return
        original_size = artist.get_sizes()[0]
        for _ in range(5):
            artist.set_sizes([original_size * 3])
            self.fig.canvas.draw_idle()
            plt.pause(0.25)
            artist.set_sizes([original_size])
            self.fig.canvas.draw_idle()
            plt.pause(0.25)
    
    def voice_command(self):
        try:
            import speech_recognition as sr
        except ImportError:
            messagebox.showerror("Voice Command", "speech_recognition module not installed.", parent=self.tk_root)
            return
        r = sr.Recognizer()
        with sr.Microphone() as source:
            messagebox.showinfo("Voice Command", "Please speak now.", parent=self.tk_root)
            try:
                audio = r.listen(source, timeout=5)
            except sr.WaitTimeoutError:
                messagebox.showerror("Voice Command", "Listening timed out.", parent=self.tk_root)
                return
        try:
            command_text = r.recognize_google(audio)
            messagebox.showinfo("Voice Command", f"You said: {command_text}", parent=self.tk_root)
            cmd_lower = command_text.lower()
            if "delete" in cmd_lower:
                self.delete_group_node(self.seed_tag)
            elif "flash" in cmd_lower:
                self.flash_node(self.seed_tag)
            elif "add" in cmd_lower:
                self.add_child_nodes(self.seed_tag)
            else:
                messagebox.showinfo("Voice Command", "Command not recognized.", parent=self.tk_root)
        except Exception as e:
            messagebox.showerror("Voice Command", f"Error: {e}", parent=self.tk_root)
    
    def create_embeddings(self):
        messagebox.showinfo("Embeddings", "Embeddings creation is not implemented.", parent=self.tk_root)
    
    def get_organisation(self):
        orgs = {node['orgUnit'] for node in self.nodes.values() if node.get('orgUnit')}
        msg = "Organisations:\n" + "\n".join(orgs) if orgs else "No organisations available."
        messagebox.showinfo("Organisations", msg, parent=self.tk_root)
    
    def export_network(self):
        filename = simpledialog.askstring("Export Network", "Enter filename (e.g. network.csv):", parent=self.tk_root)
        if filename:
            try:
                with open(filename, mode='w', newline='') as csv_file:
                    fieldnames = ['tag', 'pos', 'layer', 'shape', 'node', 'polyOrder', 'parent', 'orgUnit', 'name']
                    writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
                    writer.writeheader()
                    for node in self.nodes.values():
                        writer.writerow(node)
                messagebox.showinfo("Export Network", f"Network exported to {filename}.", parent=self.tk_root)
            except Exception as e:
                messagebox.showerror("Export Network", f"Error exporting network: {e}", parent=self.tk_root)
    
    def refresh_screen(self):
        self.ax.cla()
        self.ax.set_facecolor('black')
        for node in self.nodes.values():
            pos = node['pos']
            size = get_marker_size(node['layer'])
            color = get_node_color(node['layer'])
            scatter = self.ax.scatter(pos[0], pos[1], s=size, c=[color], picker=True)
            node['artist'] = scatter
            # Optionally, adjust label font size based on number of nodes
            self.ax.text(pos[0]+0.01, pos[1]+0.01, node['tag'], color='white', fontsize=8)
            if node['parent'] in self.nodes:
                parent_pos = self.nodes[node['parent']]['pos']
                self.ax.plot([parent_pos[0], pos[0]], [parent_pos[1], pos[1]], color='white', linewidth=2)
        self.adjust_view()
        self.fig.canvas.draw()
    
    def run(self):
        plt.show(block=True)

# -----------------------------------------------------------------------------
# MAIN ENTRY POINT
# -----------------------------------------------------------------------------

def main():
    network = VSMNetwork()
    network.run()

if __name__ == '__main__':
    main()

