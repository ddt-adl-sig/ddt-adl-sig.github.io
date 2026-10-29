
# Convertir le contenu d'une colonne en PDF

### Installation du widget

-- 1. Choisir la colonne avec le contenu du document (au format HTML),  
-- 2. Choisir la colonne de type 'pièce jointe' pour stocker le fichier PDF créé (optionnel),  
-- 3. Choisir la colonne avec le nom du fichier à créer (optionnel),  
**Colonnes optionnelles pour la mise en page :**  
-- 4. Choisir la colonne qui indique le format de mise en page (A4, A3...),  
-- 5. Choisir la colonne qui indique l'orientation de la page : portrait ou paysage,  
-- 6. Choisir la colonne (de type Entier) qui indique la marge de la page en mm.  


Remarque 1 : le contenu pour le document PDF doit être en HTML. Vous pouvez y inclure des images (les images svg ne sortent pas toujours bien dans le PDF) et des styles. Le contenu HTML peut être construit à l'aide d'une formule Grist pour y inclure des textes provenant d'autres colonnes).

Remarque 2 : la colonne pour stocker le PDF doit être de type "pièce jointe".

### Utilisation

**On a le choix pour l'enregistrement du fichier PDF :**  
-- soit dans un fichier sur votre ordinateur (il vous demandera où l'enregistrer)  
-- soit dans une colonne pièce jointe de la table associée à ce widget
