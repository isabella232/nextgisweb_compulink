# -*- coding: utf-8 -*-

'''
Construct minimum spanning tree using Prim's algorithm.
'''

import numpy as np

def dist(x, y):
    assert len(x) == len(y)
    return np.sqrt(sum((x - y)**2))

class MST():
    '''1-d self organizing map for 2-dimmential inputs
    '''
    def __init__(self, data):
        assert len(data.shape) == 2

        self.data = np.array(data)
        self.size = self.data.shape[0]
        self._set_dists()

    def _set_dists(self):
        self.dists = np.zeros((self.size, self.size))
        for i in range(self.size):
            for j in range(i, self.size):
                self.dists[i, j] = self.dists[j, i] = \
                    dist(self.data[i], self.data[j])

        diag_indices = np.arange(self.size)
        self.dists[diag_indices, diag_indices] = np.inf


    def connect(self):
        edges = []
        visited = [0]
        while len(visited) < self.size:
            new_edge = divmod(np.argmin(self.dists[visited]), self.size)
            edges.append((visited[new_edge[0]], new_edge[1]))
            visited.append(new_edge[1])
            self.dists[visited, new_edge[1]] = np.inf
            self.dists[new_edge[1], visited] = np.inf

        result = []
        for (v1, v2) in edges:
            x1, y1 = self.data[v1][0], self.data[v1][1]
            x2, y2 = self.data[v2][0], self.data[v2][1]
            result.append([[x1, y1], [x2, y2]])

        return result



if __name__ == "__main__":
    data = np.array([
        [-0.1, 0],
        [0, 1.1],
        [0, 2.03],
        [0, 3.2],
        [0, 4.1],
        [0, 5.2],
        [0, 6.02],
        [1, 5.1],
        [1, 4.03],
        [3, 1.5],
        [2, 2.01],
        [1, 2],
        [1, 3]
    ])
    conn  = MST(data)
    result = conn.connect()

    #~ import matplotlib.pyplot as plt
    #~ from matplotlib import collections  as mc
    #~ plt.plot(conn.data[:,0], conn.data[:,1], 'o')
        #~ # som.w.real, som.w.imag, 'r-o',
    #~ for line in result:
        #~ print line
        #~ v1, v2 = line[0], line[1]
        #~ x1, y1 = v1[0], v1[1]
        #~ x2, y2 = v2[0], v2[1]
        #~ print x1,y1, '=>', x2, y2
        #~ plt.plot([x1, x2], [y1, y2], '-g')
    #~ plt.show()
