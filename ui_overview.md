##Comportement et spécifications attendus

L'ui est composée de : 
- une scene qui prendra toujours le plus d'espace disponible tout en gardant son aspectRatio. Sa taille est fixée par la taille de l'image utilisée en background. Au démarrage, elle utilisera "assets/decors/scene.png" par défaut, c'est une image transparente avec les dimensions standards des décors utilisés. Elle permettra de zoomer grace à ctrl+wheel, et pan via scrollevent. Uniquement applicables si au dessus de la scene et pas des menus/panneaux.
- une timeline, resizable en hauteur et togglable, dockée en bas de l'écran. Elle affiche la ligne du temps générale et les controles de lecture standards et la gestion des keyframes. Elle affichera, de manière togglable, les différentes tracks correspondant aux différents objets/pantins présents sur la scène. Elle sera suppléée, quand non visible, par un petit panneau flottant regroupant les controles de lecture.
- une toolbar flottante, déplaçable et togglable (se contracte en 1 icone)
- différents panneaux flottants, toggleable et déplaçable. Chaque panneau aura sa fonction : inspector pour les propriétés de l'objet sélectionné, library pour afficher et permettre d'importer les assets disponibles, layer pour gérer le z-order des objets sur la scène, etc...

L'ensemble doit être pensé pour maximiser l'espace de scene à l'écran tout en restant ergonomique et pratique.
