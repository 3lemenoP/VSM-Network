from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

class Node:
    def __init__(self, tag, position, layer, poly_order=6, parent=None, name=None):
        self.tag = tag
        self.position = position  # [x, y]
        self.layer = layer
        self.poly_order = poly_order
        self.parent = parent
        self.name = name or tag
        self.children = []

    def to_dict(self):
        return {
            'tag': self.tag,
            'position': self.position,
            'layer': self.layer,
            'polyOrder': self.poly_order,
            'parent': self.parent,
            'name': self.name,
            'children': self.children
        }

class NodeManager:
    def __init__(self):
        self.nodes = {}
        self.create_seed_node()

    def create_seed_node(self):
        seed = Node('0/0/1', [0, 0], 0)
        self.nodes[seed.tag] = seed
        return seed.to_dict()

    def add_child_nodes(self, parent_tag, count):
        if parent_tag not in self.nodes:
            return {'error': 'Parent node not found'}

        parent = self.nodes[parent_tag]
        new_nodes = []

        for i in range(count):
            tag = f"{parent_tag}-{i+1}"
            # Position will be set by the frontend
            node = Node(tag, [0, 0], parent.layer + 1, parent=parent_tag)
            self.nodes[tag] = node
            parent.children.append(tag)
            new_nodes.append(node.to_dict())

        return new_nodes

    def get_node(self, tag):
        return self.nodes.get(tag).to_dict() if tag in self.nodes else None

    def get_all_nodes(self):
        return {tag: node.to_dict() for tag, node in self.nodes.items()}

node_manager = NodeManager()

@app.route('/nodes', methods=['GET'])
def get_nodes():
    return jsonify(node_manager.get_all_nodes())

@app.route('/nodes/<path:tag>', methods=['GET'])
def get_node(tag):
    # Convert back to original tag format
    tag = tag.replace('|', '/')
    node = node_manager.get_node(tag)
    return jsonify(node) if node else ('Node not found', 404)

@app.route('/nodes/children/<path:tag>', methods=['POST'])
def add_children(tag):
    # Convert back to original tag format
    tag = tag.replace('|', '/')
    data = request.json
    count = data.get('count', 6)
    new_nodes = node_manager.add_child_nodes(tag, count)
    return jsonify(new_nodes)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 